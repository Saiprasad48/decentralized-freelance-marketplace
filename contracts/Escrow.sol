// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Escrow is ReentrancyGuard {
    enum Status { OPEN, PENDING, DELIVERY, CONFIRMED, DISPUTED, REFUNDED, WITHDRAWN }
    enum EscrowType { MILESTONE, TIME }

    struct Job {
        uint256 jobId;
        address client;
        address freelancer;
        uint256 amount;
        uint256 deadline; // for time-based
        uint256[] milestones; // for milestone-based
        uint256 currentMilestone;
        EscrowType escrowType;
        Status status;
        bool delivered;
        bool confirmed;
    }

    uint256 public feePercent = 2;
    uint256 public totalJobs;
    address public arbiter;

    mapping(uint256 => Job) public jobs;

    event JobCreated(uint256 indexed jobId, address indexed client, uint256 amount, EscrowType escrowType);
    event JobFunded(uint256 indexed jobId, uint256 amount);
    event DeliverySubmitted(uint256 indexed jobId);
    event JobConfirmed(uint256 indexed jobId);
    event Disputed(uint256 indexed jobId);
    event Refunded(uint256 indexed jobId);
    event Withdrawn(address indexed to, uint256 amount);

    modifier onlyClient(uint256 jobId) {
        require(msg.sender == jobs[jobId].client, "Not client");
        _;
    }

    modifier onlyFreelancer(uint256 jobId) {
        require(msg.sender == jobs[jobId].freelancer, "Not freelancer");
        _;
    }

    constructor(address _arbiter) {
        arbiter = _arbiter;
    }

    function createJob(
        address _freelancer,
        uint256 _amount,
        uint256 _deadline,
        uint256[] memory _milestones,
        EscrowType _escrowType
    ) external returns (uint256) {
        require(_freelancer != address(0), "Invalid freelancer");
        require(_amount > 0, "Amount must be > 0");
        uint256 jobId = totalJobs++;
        jobs[jobId] = Job({
            jobId: jobId,
            client: msg.sender,
            freelancer: _freelancer,
            amount: _amount,
            deadline: _deadline,
            milestones: _milestones,
            currentMilestone: 0,
            escrowType: _escrowType,
            status: Status.OPEN,
            delivered: false,
            confirmed: false
        });
        emit JobCreated(jobId, msg.sender, _amount, _escrowType);
        return jobId;
    }

    function fundJob(uint256 jobId) external payable onlyClient(jobId) nonReentrant {
        Job storage job = jobs[jobId];
        require(job.status == Status.OPEN, "Job not open");
        require(msg.value == job.amount, "Incorrect amount");
        job.status = Status.PENDING;
        emit JobFunded(jobId, msg.value);
    }

    function submitDelivery(uint256 jobId) external onlyFreelancer(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == Status.PENDING, "Job not pending");
        job.delivered = true;
        job.status = Status.DELIVERY;
        emit DeliverySubmitted(jobId);
    }

    function confirmDelivery(uint256 jobId) external onlyClient(jobId) nonReentrant {
        Job storage job = jobs[jobId];
        require(job.status == Status.DELIVERY, "Not delivered");
        uint256 fee = (job.amount * feePercent) / 100;
        uint256 payout = job.amount - fee;
        (bool sent, ) = job.freelancer.call{value: payout}("");
        require(sent, "Payment failed");
        job.confirmed = true;
        job.status = Status.CONFIRMED;
        emit JobConfirmed(jobId);
    }

    function dispute(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client || msg.sender == job.freelancer, "Not participant");
        require(job.status == Status.DELIVERY, "Not delivered");
        job.status = Status.DISPUTED;
        emit Disputed(jobId);
    }

    function refund(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(msg.sender == arbiter, "Only arbiter");
        require(job.status == Status.DISPUTED, "Not disputed");
        (bool sent, ) = job.client.call{value: job.amount}("");
        require(sent, "Refund failed");
        job.status = Status.REFUNDED;
        emit Refunded(jobId);
    }
}