import { z } from "zod";

// Zod Schemas for MCP Tool Arguments

export const W3LoginArgsSchema = z
  .object({})
  .describe(
    "Initiates the w3 login process using the pre-configured email (W3_LOGIN_EMAIL env var). User MUST check email to complete authentication."
  );
export const W3SpaceLsArgsSchema = z.object({});
export const W3SpaceUseArgsSchema = z.object({
  spaceDid: z
    .string()
    .startsWith("did:key:")
    .describe("The DID of the space to select (e.g., did:key:...)."),
});
export const W3SpaceCreateArgsSchema = z
  .object({
    name: z
      .string()
      .optional()
      .describe("An optional user-friendly name for the new space."),
  })
  .describe("Creates a new space with a user-friendly name.");
export const W3UpArgsSchema = z
  .object({
    paths: z
      .array(z.string())
      .min(1)
      .describe(
        "Array of one or more ABSOLUTE paths to files or directories to upload."
      ),
    noWrap: z
      .boolean()
      .optional()
      .default(false)
      .describe("Don't wrap input files with a directory."),
    hidden: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include paths starting with '.'."),
  })
  .describe(
    "Generates and prints a new ed25519 key pair. Does not automatically use it for the agent."
  );
export const W3LsArgsSchema = z.object({
  json: z
    .boolean()
    .optional()
    .default(true)
    .describe("Format output as newline delimited JSON (default: true)."),
});
export const W3RmArgsSchema = z.object({
  cid: z
    .string()
    .describe(
      "Root Content CID (e.g., bafy...) to remove from the uploads listing."
    ),
  removeShards: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Also remove underlying shards from the store (default: false). Use with caution."
    ),
});
export const W3OpenArgsSchema = z.object({
  cid: z.string().describe("The CID of the content to open."),
  path: z
    .string()
    .optional()
    .describe("Optional path within the content to append to the URL."),
});
export const W3SpaceInfoArgsSchema = z.object({
  spaceDid: z
    .string()
    .startsWith("did:key:")
    .optional()
    .describe(
      "Optional DID of the space to get info for (defaults to current space)."
    ),
  json: z
    .boolean()
    .optional()
    .default(true)
    .describe("Format output as newline delimited JSON (default: true)."),
});
export const W3SpaceAddArgsSchema = z.object({
  proof: z
    .string()
    .describe(
      "Filesystem path to a CAR encoded UCAN proof, or a base64 identity CID string."
    ),
});
export const W3DelegationCreateArgsSchema = z.object({
  audienceDid: z
    .string()
    .describe(
      "The DID of the audience receiving the delegation (e.g., did:key:...)."
    ),
  capabilities: z
    .array(z.string())
    .min(1)
    .describe(
      "One or more capabilities to delegate (e.g., ['space/*', 'upload/*'])."
    ),
  name: z.string().optional().describe("Human-readable name for the audience."),
  type: z
    .enum(["device", "app", "service"])
    .optional()
    .describe("Type of the audience."),
  output: z
    .string()
    .optional()
    .describe(
      "ABSOLUTE path of file to write the exported delegation CAR file to."
    ),
  base64: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Format output as base64 identity CID string instead of writing to a file."
    ),
});
export const W3DelegationLsArgsSchema = z.object({
  json: z
    .boolean()
    .optional()
    .default(true)
    .describe("Format output as newline delimited JSON (default: true)."),
});
export const W3DelegationRevokeArgsSchema = z.object({
  delegationCid: z.string().describe("The CID of the delegation to revoke."),
  proof: z
    .string()
    .optional()
    .describe(
      "ABSOLUTE path to a file containing the delegation and any additional proofs needed."
    ),
});
export const W3ProofAddArgsSchema = z.object({
  proofPath: z
    .string()
    .describe(
      "ABSOLUTE path to the CAR encoded proof file delegated to this agent."
    ),
});
export const W3ProofLsArgsSchema = z.object({
  json: z
    .boolean()
    .optional()
    .default(true)
    .describe("Format output as newline delimited JSON (default: true)."),
});
export const W3KeyCreateArgsSchema = z
  .object({
    json: z
      .boolean()
      .optional()
      .default(false)
      .describe("Export the new key pair as dag-json (default: false)."),
  })
  .describe(
    "Generates and prints a new ed25519 key pair. Does not automatically use it for the agent."
  );
export const W3BridgeGenerateTokensArgsSchema = z
  .object({
    capabilities: z
      .array(z.string())
      .min(1)
      .describe("One or more capabilities to delegate (e.g., ['space/info'])."),
    expiration: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Unix timestamp (in seconds) for expiration. Zero means no expiration."
      ),
    json: z
      .boolean()
      .optional()
      .default(true)
      .describe("Output JSON suitable for fetch headers (default: true)."),
  })
  .describe("Generates authentication tokens for using the UCAN-HTTP bridge.");
export const W3CanBlobAddArgsSchema = z
  .object({
    path: z.string().describe("ABSOLUTE path to the blob file to store."),
  })
  .describe("Stores a single file as a blob directly with the service.");
export const W3CanBlobLsArgsSchema = z
  .object({
    json: z
      .boolean()
      .optional()
      .default(true)
      .describe("Format output as newline delimited JSON (default: true)."),
    size: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Desired number of results to return."),
    cursor: z
      .string()
      .optional()
      .describe(
        "Opaque cursor string from a previous response for pagination."
      ),
  })
  .describe("Lists blobs stored in the current space.");
export const W3CanBlobRmArgsSchema = z
  .object({
    multihash: z
      .string()
      .describe("Base58btc encoded multihash of the blob to remove."),
  })
  .describe(
    "Removes a blob from the store by its base58btc encoded multihash."
  );
export const W3CanIndexAddArgsSchema = z
  .object({
    cid: z.string().describe("CID of the index to add."),
  })
  .describe(
    "Registers an index CID with the service (advanced use). Please refer to storacha.network documentation for details on indices."
  );
export const W3CanUploadAddArgsSchema = z
  .object({
    rootCid: z.string().describe("Root data CID of the DAG to register."),
    shardCids: z
      .array(z.string())
      .min(1)
      .describe("One or more shard CIDs where the DAG data is stored."),
  })
  .describe(
    "Manually registers an upload DAG by its root CID and shard CIDs (advanced use). This is typically used after storing CAR shards manually."
  );
export const W3CanUploadLsArgsSchema = z
  .object({
    json: z
      .boolean()
      .optional()
      .default(true)
      .describe("Format output as newline delimited JSON (default: true)."),
    shards: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Pretty print with shards in output (ignored if --json is true)."
      ),
    size: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Desired number of results to return."),
    cursor: z
      .string()
      .optional()
      .describe(
        "Opaque cursor string from a previous response for pagination."
      ),
    pre: z
      .boolean()
      .optional()
      .default(false)
      .describe("Return the page of results preceding the cursor."),
  })
  .describe(
    "Lists uploads registered in the current space (advanced view, shows underlying structure)."
  );
export const W3CanUploadRmArgsSchema = z
  .object({
    rootCid: z
      .string()
      .describe("Root CID of the upload to remove from the list."),
  })
  .describe(
    "Removes an upload listing by its root CID (advanced use). Does not remove the underlying blobs/shards."
  );
export const W3PlanGetArgsSchema = z
  .object({
    accountId: z
      .string()
      .optional()
      .describe(
        "Optional account ID to get plan for (defaults to current authorized account)."
      ),
  })
  .describe(
    "Displays the plan associated with the current or specified account."
  );
export const W3AccountLsArgsSchema = z
  .object({})
  .describe(
    "Lists all accounts the current agent is **authorized** for. Use this command after `w3_login` and email validation to confirm the agent is successfully linked to your storacha.network account(s). **Note:** Agent state may be ephemeral (e.g., in Docker). Check authorization status with this command after (re)connecting, and use `w3_login` if needed."
  );
export const W3SpaceProvisionArgsSchema = z
  .object({
    customerId: z
      .string()
      .describe(
        "Customer identifier (e.g., email or account DID) to associate the space with."
      ),
    spaceDid: z
      .string()
      .startsWith("did:key:")
      .describe("The DID of the space to provision."),
  })
  .describe("Associates a space with a customer/billing account.");
export const W3CouponCreateArgsSchema = z
  .object({
    claimCode: z.string().describe("The claim code for the coupon."),
  })
  .describe("Attempts to create/claim a coupon using a claim code.");
export const W3UsageReportArgsSchema = z
  .object({
    spaceDid: z
      .string()
      .startsWith("did:key:")
      .optional()
      .describe(
        "Optional DID of the space to get usage for (defaults to current space)."
      ),
    json: z
      .boolean()
      .optional()
      .default(true)
      .describe("Format output as JSON (default: true)."),
  })
  .describe(
    "Displays a storage usage report for the current or specified space."
  );
export const W3CanAccessClaimArgsSchema = z
  .object({
    proof: z
      .string()
      .describe(
        "Delegation proof (e.g., path to CAR file or base64 CID string) containing capabilities to claim."
      ),
  })
  .describe(
    "Claims delegated capabilities for the authorized account using a provided proof."
  );
export const W3CanStoreAddArgsSchema = z
  .object({
    path: z.string().describe("ABSOLUTE path to the CAR file to store."),
  })
  .describe(
    "Stores a CAR file with the service (advanced use). This is often a prerequisite for `w3_can_upload_add`."
  );
export const W3CanStoreLsArgsSchema = z
  .object({
    json: z
      .boolean()
      .optional()
      .default(true)
      .describe("Format output as newline delimited JSON (default: true)."),
    size: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Desired number of results to return."),
    cursor: z
      .string()
      .optional()
      .describe(
        "Opaque cursor string from a previous response for pagination."
      ),
  })
  .describe(
    "Lists stored CAR files (shards) in the current space (advanced use)."
  );
export const W3CanStoreRmArgsSchema = z
  .object({
    carCid: z
      .string()
      .describe("CID of the CAR shard to remove from the store."),
  })
  .describe(
    "Removes a stored CAR shard by its CID (advanced use). Use with extreme caution, as this deletes the underlying data shard."
  );
export const W3CanFilecoinInfoArgsSchema = z
  .object({
    pieceCid: z
      .string()
      .describe("The Piece CID to get Filecoin information for."),
  })
  .describe(
    "Gets Filecoin deal information for a given Piece CID (advanced use)."
  );
export const W3ResetArgsSchema = z
  .object({
    confirmReset: z
      .literal("yes-i-am-sure")
      .describe(
        "Must be exactly 'yes-i-am-sure' to confirm resetting agent state (removes proofs/delegations)."
      ),
  })
  .describe(
    "DANGEROUS: Resets the agent state, removing all proofs and delegations but retaining the agent DID. Requires explicit confirmation argument."
  );
