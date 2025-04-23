import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { create as ipfsHttpClient } from "ipfs-http-client";
import EscrowJSON from "./abis/Escrow.json";
import ReputationTokenJSON from "./abis/ReputationToken.json";
import DAOJSON from "./abis/DisputeDAO.json";

// Replace with your deployed contract addresses
const ESCROW_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const REP_TOKEN_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const DAO_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

// IPFS client setup
const ipfs = ipfsHttpClient("https://ipfs.infura.io:5001/api/v0");

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState();
  const [signer, setSigner] = useState();
  const [escrow, setEscrow] = useState();
  const [repToken, setRepToken] = useState();
  const [dao, setDao] = useState();

  // Escrow states
  const [freelancer, setFreelancer] = useState("");
  const [amount, setAmount] = useState("");
  const [jobId, setJobId] = useState("");
  const [file, setFile] = useState(null);
  const [ipfsUrl, setIpfsUrl] = useState("");
  const [repBalance, setRepBalance] = useState(0);

  // DAO states
  const [disputeId, setDisputeId] = useState("");
  const [voteOption, setVoteOption] = useState(""); // "Client" or "Freelancer"

  // Wallet connection and contract setup
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    const _provider = new ethers.BrowserProvider(window.ethereum);
    await _provider.send("eth_requestAccounts", []);
    const _signer = await _provider.getSigner();
    const _account = await _signer.getAddress();
    setProvider(_provider);
    setSigner(_signer);
    setAccount(_account);

    setEscrow(new ethers.Contract(ESCROW_ADDRESS, EscrowJSON.abi, _signer));
    setRepToken(new ethers.Contract(REP_TOKEN_ADDRESS, ReputationTokenJSON.abi, _signer));
    setDao(new ethers.Contract(DAO_ADDRESS, DAOJSON.abi, _signer));
  };

  // Fetch reputation token balance
  useEffect(() => {
    const fetchRep = async () => {
      if (repToken && account) {
        const bal = await repToken.balanceOf(account);
        setRepBalance(bal.toString());
      }
    };
    fetchRep();
  }, [repToken, account]);

  // Escrow: Create a job
  const createJob = async () => {
    if (!escrow || !freelancer || !amount) return;
    const tx = await escrow.createJob(
      freelancer,
      ethers.parseEther(amount),
      0, // deadline (for time-based, adjust as needed)
      [], // milestones
      0 // EscrowType.MILESTONE
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(x => x.fragment && x.fragment.name === "JobCreated");
    if (event) {
      setJobId(event.args.jobId.toString());
      alert(`Job created with ID: ${event.args.jobId}`);
    }
  };

  // Escrow: Fund a job
  const fundJob = async () => {
    if (!escrow || !jobId || !amount) return;
    await escrow.fundJob(jobId, { value: ethers.parseEther(amount) });
    alert("Job funded!");
  };

  // Escrow: Submit delivery (upload file to IPFS)
  const submitDelivery = async () => {
    if (!escrow || !jobId || !file) return;
    // Upload to IPFS
    const added = await ipfs.add(file);
    setIpfsUrl(`https://ipfs.io/ipfs/${added.path}`);
    // Call contract (optionally store IPFS hash on-chain)
    await escrow.submitDelivery(jobId);
    alert("Delivery submitted!");
  };

  // Escrow: Confirm delivery
  const confirmDelivery = async () => {
    if (!escrow || !jobId) return;
    await escrow.confirmDelivery(jobId);
    alert("Delivery confirmed and payment released!");
  };

  // Escrow: Initiate dispute
  const disputeJob = async () => {
    if (!escrow || !jobId) return;
    await escrow.dispute(jobId);
    alert("Dispute initiated!");
  };

  // DAO: Create dispute (for demo, client initiates)
  const createDispute = async () => {
    if (!dao || !freelancer) return;
    // Send some ETH as juror reward pool (e.g., 0.05)
    const tx = await dao.createDispute(freelancer, "Dispute reason", { value: ethers.parseEther("0.05") });
    const receipt = await tx.wait();
    const event = receipt.logs.find(x => x.fragment && x.fragment.name === "DisputeCreated");
    if (event) {
      setDisputeId(event.args.disputeId.toString());
      alert(`Dispute created with ID: ${event.args.disputeId}`);
    }
  };

  // DAO: Register as juror
  const registerAsJuror = async () => {
    if (!dao) return;
    await dao.registerAsJuror();
    alert("Registered as juror!");
  };

  // DAO: Vote on dispute
  const voteOnDispute = async () => {
    if (!dao || !disputeId || !voteOption) return;
    const voteEnum = voteOption === "Client" ? 1 : 2;
    await dao.voteOnDispute(disputeId, voteEnum);
    alert("Vote cast!");
  };

  // File upload handler
  const onFileChange = e => {
    setFile(e.target.files[0]);
  };

  return (
    <div className="App" style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <h1>Decentralized Freelance Marketplace</h1>
      <button onClick={connectWallet} style={{ marginBottom: 16 }}>
        {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
      </button>
      {account && (
        <div>
          <h2>Reputation Token Balance: {repBalance}</h2>
          <hr />

          <h3>Create New Job</h3>
          <input
            placeholder="Freelancer Address"
            value={freelancer}
            onChange={e => setFreelancer(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <input
            placeholder="Amount (ETH)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <button onClick={createJob}>Create Job</button>

          <hr />
          <h3>Fund Job</h3>
          <input
            placeholder="Job ID"
            value={jobId}
            onChange={e => setJobId(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <button onClick={fundJob}>Fund Job</button>

          <hr />
          <h3>Submit Delivery</h3>
          <input type="file" onChange={onFileChange} style={{ marginBottom: 8 }} />
          <button onClick={submitDelivery}>Submit Delivery</button>
          {ipfsUrl && (
            <div>
              <a href={ipfsUrl} target="_blank" rel="noopener noreferrer">
                View Uploaded File
              </a>
            </div>
          )}

          <hr />
          <h3>Confirm Delivery</h3>
          <input
            placeholder="Job ID"
            value={jobId}
            onChange={e => setJobId(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <button onClick={confirmDelivery}>Confirm Delivery</button>

          <hr />
          <h3>Dispute Job</h3>
          <input
            placeholder="Job ID"
            value={jobId}
            onChange={e => setJobId(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <button onClick={disputeJob}>Dispute</button>

          <hr />
          <h3>DAO: Dispute Resolution</h3>
          <button onClick={registerAsJuror}>Register as Juror</button>
          <br /><br />
          <button onClick={createDispute}>Create Dispute (Demo)</button>
          <input
            placeholder="Dispute ID"
            value={disputeId}
            onChange={e => setDisputeId(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <select value={voteOption} onChange={e => setVoteOption(e.target.value)} style={{ width: "100%" }}>
            <option value="">Select Vote</option>
            <option value="Client">Vote Client</option>
            <option value="Freelancer">Vote Freelancer</option>
          </select>
          <button onClick={voteOnDispute}>Vote</button>
        </div>
      )}
    </div>
  );
}

export default App;