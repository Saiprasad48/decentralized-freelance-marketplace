// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Escrow {
    enum State { AWAITING_PAYMENT, AWAITING_DELIVERY, COMPLETE, REFUNDED }
    State public state;

    address public buyer;
    address public seller;
    address public arbiter;
    uint256 public amount;

    constructor(address _seller, address _arbiter) {
        buyer = msg.sender;
        seller = _seller;
        arbiter = _arbiter;
        state = State.AWAITING_PAYMENT;
    }

    function deposit() external payable {
        require(msg.sender == buyer, "Only buyer can deposit");
        require(state == State.AWAITING_PAYMENT, "Already deposited");
        amount = msg.value;
        state = State.AWAITING_DELIVERY;
    }

    function confirmDelivery() external {
        require(msg.sender == buyer, "Only buyer can confirm");
        require(state == State.AWAITING_DELIVERY, "Cannot confirm");
        payable(seller).transfer(amount);
        state = State.COMPLETE;
    }

    function refund() external {
        require(msg.sender == arbiter, "Only arbiter can refund");
        require(state == State.AWAITING_DELIVERY, "Refund not allowed");
        payable(buyer).transfer(amount);
        state = State.REFUNDED;
    }
}