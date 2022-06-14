//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Voting {

    address payable public owner;
    uint256 internal votingsCount;
    uint256 internal contractBalance;

    struct Candidate {
        bool exist;
        uint256 votes;
    }

    struct CurrentVoting {
        uint256 finishTime;
        bool active;
        mapping(address => Candidate) candidates;
        mapping(address => address) voters;
        address[] allCandidates;
        uint256 votesCount;
        uint256 maxVotes;
        address winningCandidate;
    }

    mapping(uint256 => CurrentVoting) public votings;
    
    event CreateVoting(uint256 _id);
    event VotingFinished(uint256 _id, address _winner, uint256 reward);
    event Transfer(address indexed _to, uint _value);  

    constructor() {
       owner = payable(msg.sender);
    }
    
    modifier onlyOwner {
        require(msg.sender == owner, "You are not owner");
        _;
    }

    function createVoting(uint256 _index, address[] memory _candidates) public onlyOwner {
        require(_candidates.length > 1, "Should be at least 2 candidates");

        _index = votingsCount;
        CurrentVoting storage voting = votings[_index]; 

        for (uint256 i = 0; i < _candidates.length; i++) {
            require(!voting.candidates[_candidates[i]].exist, "Should be all different addresses");
            voting.candidates[_candidates[i]].exist = true;
            voting.allCandidates.push(_candidates[i]);
        }

        voting.active = true;
        voting.finishTime = block.timestamp + 3 days;
        votingsCount++;

        emit CreateVoting(_index);
    }

    
    function vote(uint256 _index, address _candidate) public payable {
        CurrentVoting storage voting = votings[_index]; 

        require(voting.finishTime > block.timestamp, "Voting has finished");
        require(msg.sender != _candidate, "Voting for self is prohibited");
        require(msg.value == 1e16, "Price must be 0.01 eth");
        require(voting.candidates[_candidate].exist, "There is no such candidate");
        require(voting.voters[msg.sender] == address(0), "You can vote only once");

        voting.candidates[_candidate].votes++;
        voting.voters[msg.sender] = _candidate;
        voting.votesCount++;
        contractBalance += msg.value;

        if (voting.candidates[_candidate].votes > voting.maxVotes) {
            voting.maxVotes = voting.candidates[_candidate].votes;
            voting.winningCandidate = _candidate;
        }
    }

    function transfer(address _to, uint256 _value) internal {
        payable(_to).transfer(_value);
        emit Transfer(_to, _value);
    }

    function finishVoting(uint256 _index) public {
        CurrentVoting storage voting = votings[_index];

        require(block.timestamp >= voting.finishTime, "Voting has not finished");

        voting.active = false;
        uint256 reward = voting.votesCount * 1e16 * 90 / 100;
        transfer(voting.winningCandidate, reward);
        contractBalance -= reward;

        emit VotingFinished(_index, voting.winningCandidate, reward);
    }

    function withdraw(uint256 _amount) public onlyOwner {
        require(_amount <= contractBalance, "Insufficient contract balance"); 

        contractBalance -= _amount;
        payable(owner).transfer(_amount);
    }

    function getVotingsCount() public view returns (uint256) {
        return votingsCount;
    }

    function getVotingInfo(uint256 _index) public view returns (
        uint256 _finishTime, bool _active, address[] memory _allCandidates, 
        uint256 _votesCount, address _winningCandidate ) {
        return(votings[_index].finishTime, votings[_index].active, votings[_index].allCandidates, votings[_index].votesCount, votings[_index].winningCandidate);
    }
    
    function getContractBalance() public onlyOwner view returns (uint256) {
        return contractBalance;
    }
}
