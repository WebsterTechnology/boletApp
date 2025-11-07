const verifyCode = async () => {
  try {
    const result = await confirmationResult.confirm(code); // 6-digit code
    const firebaseUser = result.user;

    // Send phone & password to your backend to create user
    await axios.post("/api/users", {
      phone: firebaseUser.phoneNumber,
      password: fourDigitPassword, // from step 1
    });

    navigate("/game");
  } catch (error) {
    console.error("Invalid code", error);
  }
};
