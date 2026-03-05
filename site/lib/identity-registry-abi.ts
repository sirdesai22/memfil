// Minimal ABI for ERC-8004 Identity Registry — register() function only.
// Used by the registration form to submit an agent card URL on-chain.
export const IDENTITY_REGISTRY_ABI = [
  {
    type: "function",
    name: "register",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;
