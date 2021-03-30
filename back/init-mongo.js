db.createUser({
  user: "myUser",
  pwd: "Contrasenna_1234",
  roles: [
    {
      role: "readWrite",
      db: "erc20-example",
    },
  ],
});
