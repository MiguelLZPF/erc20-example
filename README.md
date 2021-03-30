# ERC20 Example

Simple exercise where the objective is to build the SCs and the Backend to support the creation of two users and the transfer of tokens between them.

Functionalities:

 - Create user
 - Deposit money
 - Transfer between users

To achieve it, I develop a set of SCs with the required functionalities and others to grant them of complete CRUD operations against users. Smart Contracts are in a Hardhat project in the /contracts folder.

The Backend part of the exercise is developed in Node TS and it has the needed routes and functions to support basic requirements. It's based on this REST backend server: https://github.com/MiguelLZPF/RESTserver

## Smart Contracts

[Smart Contracts README.md](./contracts/README.md)

## Backend

[Backend README.md](./back/README.md)