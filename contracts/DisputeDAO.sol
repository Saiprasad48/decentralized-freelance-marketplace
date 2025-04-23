// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DisputeDAO {
    struct Proposal {
        uint256 jobId;
        string description;
        uint256 yesVotes;
        uint256 noVotes;
        mapping(address => bool) voted;
        bool executed;
    }
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;

    event ProposalCreated(uint256 indexed proposalId, uint256 jobId, string description);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support);

    function createProposal(uint256 jobId, string memory description) external returns (uint256) {
        Proposal storage p = proposals[proposalCount];
        p.jobId = jobId;
        p.description = description;
        emit ProposalCreated(proposalCount, jobId, description);
        return proposalCount++;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(!p.voted[msg.sender], "Already voted");
        require(!p.executed, "Already executed");
        p.voted[msg.sender] = true;
        if (support) {
            p.yesVotes++;
        } else {
            p.noVotes++;
        }
        emit Voted(proposalId, msg.sender, support);
    }

    function execute(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(!p.executed, "Already executed");
        require(p.yesVotes + p.noVotes > 0, "No votes");
        // For demo: if yesVotes > noVotes, mark as executed.
        if (p.yesVotes > p.noVotes) {
            p.executed = true;
        }
    }
}