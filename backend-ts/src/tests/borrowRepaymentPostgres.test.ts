import { describe, expect, it } from "vitest";
const { Client } = require("pg") as { Client: new (options: { connectionString: string | undefined }) => { connect(): Promise<void>; query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, any>[]; rowCount: number | null }>; end(): Promise<void> } };
import { allocateWalletRepayment, loanTotal, repaymentLedgerReconciles } from "../services/borrowRepayment";

/** Real PostgreSQL rollback test; uses only session-local temporary tables in CI. */
describe.skipIf(!process.env.SOL_PG_TEST_URL)("wallet repayment PostgreSQL transaction", () => {
  it("atomically debits the wallet, records repayment, prevents duplicate keys, and rolls back", async () => {
    const client = new Client({ connectionString: process.env.SOL_PG_TEST_URL });
    await client.connect();
    try {
      await client.query("BEGIN");
      await client.query('CREATE TEMP TABLE test_wallet (id integer PRIMARY KEY, play integer NOT NULL, withdraw integer NOT NULL) ON COMMIT DROP');
      await client.query('CREATE TEMP TABLE test_loan (id integer PRIMARY KEY, principal integer NOT NULL, repaid integer NOT NULL) ON COMMIT DROP');
      await client.query('CREATE TEMP TABLE test_ledger (loan_id integer NOT NULL, amount integer NOT NULL, payment_key text UNIQUE NOT NULL) ON COMMIT DROP');
      await client.query("INSERT INTO test_wallet VALUES (10,1600,315)");
      await client.query("INSERT INTO test_loan VALUES (7,50,0)");
      const wallet = (await client.query("SELECT play,withdraw FROM test_wallet WHERE id=10 FOR UPDATE")).rows[0];
      const loan = (await client.query("SELECT principal,repaid FROM test_loan WHERE id=7 FOR UPDATE")).rows[0];
      const amount=10;
      const allocation=allocateWalletRepayment(wallet.play,wallet.withdraw,amount);
      expect(allocation).not.toBeNull();
      await client.query("UPDATE test_wallet SET play=$1,withdraw=$2 WHERE id=10",[allocation!.playAfter,allocation!.withdrawAfter]);
      await client.query("UPDATE test_loan SET repaid=repaid+$1 WHERE id=7",[amount]);
      await client.query("INSERT INTO test_ledger VALUES (7,$1,$2)",[amount,"test-repayment-000001"]);
      const saved=(await client.query("SELECT play,withdraw FROM test_wallet WHERE id=10")).rows[0];
      const savedLoan=(await client.query("SELECT principal,repaid FROM test_loan WHERE id=7")).rows[0];
      const ledger=(await client.query("SELECT amount FROM test_ledger WHERE loan_id=7")).rows;
      expect(saved).toEqual({play:1600,withdraw:305});
      expect(loanTotal(savedLoan.principal)-savedLoan.repaid).toBe(50);
      expect(repaymentLedgerReconciles(savedLoan.repaid,ledger.map(r=>r.amount))).toBe(true);
      const duplicate=await client.query("INSERT INTO test_ledger VALUES (7,$1,$2) ON CONFLICT (payment_key) DO NOTHING RETURNING amount",[amount,"test-repayment-000001"]);
      expect(duplicate.rowCount).toBe(0);
      expect((await client.query("SELECT count(*)::integer AS count FROM test_ledger")).rows[0].count).toBe(1);
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  });
});
