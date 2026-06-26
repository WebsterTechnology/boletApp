// import axios from "./axios";

// const API =
//     import.meta.env.VITE_API_URL ||
//     "https://boletapp-production.up.railway.app";

// function getUserAndPoints() {
//     try {
//         const user = JSON.parse(localStorage.getItem("user") || "{}");


//         return {
//             points: Number(
//                 user.points ??
//                 localStorage.getItem("userPoints") ??
//                 0
//             ),
//         };


//     } catch {
//         return {
//             points: Number(
//                 localStorage.getItem("userPoints") || 0
//             ),
//         };
//     }
// }

// function getBetPayload(bet, location) {
//     const pwen = parseInt(bet.amount, 10);

//     if (bet.type === "Yon Chif") {
//         return {
//             endpoint: "/api/yonchif",
//             body: {
//                 number: bet.number,
//                 pwen,
//                 location,
//             },
//         };
//     }

//     if (bet.type === "De Chif") {
//         return {
//             endpoint: "/api/dechif",
//             body: {
//                 number: bet.number,
//                 pwen,
//                 location,
//             },
//         };
//     }

//     if (bet.type === "Twa Chif") {
//         return {
//             endpoint: "/api/twachif",
//             body: {
//                 number: bet.number,
//                 pwen,
//                 location,
//             },
//         };
//     }

//     if (bet.type === "Katchif") {
//         return {
//             endpoint: "/api/katchif",
//             body: {
//                 number: bet.number,
//                 pwen,
//                 location,
//             },
//         };
//     }

//     if (bet.type === "Maryaj") {
//         return {
//             endpoint: "/api/maryaj",
//             body: {
//                 part1: bet.part1,
//                 part2: bet.part2,
//                 pwen,
//                 location,
//             },
//         };
//     }

//     return null;
// }

// export default async function submitAllBets({
//     bets,
//     selectedLocations,
//     deleteBet,
// }) {
//     const token = localStorage.getItem("token");

//     const { points } = getUserAndPoints();

//     const total = bets.reduce(
//         (sum, bet) => sum + Number(bet.amount || 0),
//         0
//     );

//     const finalTotal =
//         total * selectedLocations.length;

//     if (points < finalTotal) {
//         throw new Error("Ou pa gen ase pwen.");
//     }

//     for (const bet of bets) {


//         for (const location of selectedLocations) {
//             const payload = getBetPayload(
//                 bet,
//                 location
//             );

//             if (!payload) continue;

//             await axios.post(
//                 `${API}${payload.endpoint}`,
//                 payload.body,
//                 {
//                     headers: {
//                         Authorization: `Bearer ${token}`,
//                     },
//                 }
//             );
//         }
//     }

//     const updatedPoints =
//         points - finalTotal;

//     const user = JSON.parse(
//         localStorage.getItem("user") || "{}"
//     );

//     user.points = updatedPoints;

//     localStorage.setItem(
//         "user",
//         JSON.stringify(user)
//     );

//     localStorage.setItem(
//         "userPoints",
//         String(updatedPoints)
//     );

//     window.dispatchEvent(
//         new Event("pointsUpdated")
//     );

//     bets.forEach((bet) => deleteBet(bet.id));

//     return {
//         success: true,
//         total: finalTotal,
//         remaining: updatedPoints,
//     };
// }

import axios from "./axios";

function getUserAndPoints() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    return {
      points: Number(
        user.points ??
          localStorage.getItem("userPoints") ??
          0
      ),
    };
  } catch {
    return {
      points: Number(
        localStorage.getItem("userPoints") || 0
      ),
    };
  }
}

function createReceiptId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return (
    Date.now().toString() +
    "-" +
    Math.random().toString(36).substring(2, 8)
  );
}

function getBetPayload(bet, location, receiptId) {
  const pwen = parseInt(bet.amount, 10);

  if (bet.type === "Yon Chif") {
    return {
      endpoint: "/api/yonchif",
      body: {
        number: bet.number,
        pwen,
        location,
        receiptId,
      },
    };
  }

  if (bet.type === "De Chif") {
    return {
      endpoint: "/api/dechif",
      body: {
        number: bet.number,
        pwen,
        location,
        receiptId,
      },
    };
  }

    if (bet.type === "Twa Chif") {
    return {
      endpoint: "/api/twachif",
      body: {
        number: bet.number,
        pwen,
        location,
        receiptId,
      },
    };
  }

  if (bet.type === "Katchif") {
    return {
      endpoint: "/api/katchif",
      body: {
        number: bet.number,
        pwen,
        location,
        receiptId,
      },
    };
  }

  if (bet.type === "Maryaj") {
    return {
      endpoint: "/api/maryaj",
      body: {
        part1: bet.part1,
        part2: bet.part2,
        pwen,
        location,
        receiptId,
      },
    };
  }

  return null;
}

export default async function submitAllBets({
  bets,
  selectedLocations,
  deleteBet,
}) {
  const { points } = getUserAndPoints();

  const receiptId = createReceiptId();

  const total = bets.reduce(
    (sum, bet) => sum + Number(bet.amount || 0),
    0
  );

  const finalTotal =
    total * selectedLocations.length;

  if (points < finalTotal) {
    throw new Error("Ou pa gen ase pwen.");
  }
    for (const bet of bets) {
    for (const location of selectedLocations) {
      const payload = getBetPayload(
        bet,
        location,
        receiptId
      );

      if (!payload) continue;

      await axios.post(
        payload.endpoint,
        payload.body
      );
    }
  }

  const updatedPoints =
    points - finalTotal;

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  user.points = updatedPoints;

  localStorage.setItem(
    "user",
    JSON.stringify(user)
  );

  localStorage.setItem(
    "userPoints",
    String(updatedPoints)
  );

  window.dispatchEvent(
    new Event("pointsUpdated")
  );
    bets.forEach((bet) => {
    deleteBet(bet.id);
  });

  return {
    success: true,
    receiptId,
    total: finalTotal,
    remaining: updatedPoints,
  };
}