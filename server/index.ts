import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import express, { type NextFunction, type Request, type Response } from "express";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { fileURLToPath } from "url";

type FirebaseAppletConfig = {
  firestoreDatabaseId?: string;
};

type AuthenticatedRequest = Request & {
  auth?: admin.auth.DecodedIdToken;
};

type PaymentNetworkId = "trc20" | "erc20" | "bep20";
type PaymentStatus = "pending" | "processing" | "completed" | "cancelled" | "failed";

type PaymentDocument = {
  userId: string;
  type: "deposit";
  status: PaymentStatus;
  network: PaymentNetworkId;
  networkLabel: string;
  address: string;
  requestedAmount: number;
  payableAmount: number;
  reference: string;
  note: string | null;
  retryOf?: string | null;
  txHash?: string | null;
  explorerUrl?: string | null;
  createdAt?: admin.firestore.Timestamp | null;
  updatedAt?: admin.firestore.Timestamp | null;
  expiresAt?: admin.firestore.Timestamp | null;
  createdBlockNumber?: number | null;
  markedPaidAt?: admin.firestore.Timestamp | null;
  confirmedAt?: admin.firestore.Timestamp | null;
  balanceAppliedAt?: admin.firestore.Timestamp | null;
};

type PaymentNetworkConfig = {
  id: PaymentNetworkId;
  label: string;
  kind: "tron" | "evm";
  walletAddress: string;
  explorerTxBaseUrl: string;
  confirmationsRequired: number;
  contractAddress: string;
  rpcUrl?: string;
};

type DevVerificationLinkRequest = {
  email?: string;
  continueUrl?: string;
};

type SocialPlatformId = "tiktok" | "instagram" | "youtube";

type VerifySocialOwnershipRequest = {
  platform?: SocialPlatformId;
  username?: string;
  url?: string;
  code?: string;
};

const PORT = Number(process.env.PORT || process.env.SERVER_PORT || process.env.TELEGRAM_AUTH_PORT || 5171);
const PAYMENT_MIN_AMOUNT = Number(process.env.PAYMENT_MIN_AMOUNT || 10);
const PAYMENT_EXPIRY_MINUTES = Number(process.env.PAYMENT_EXPIRY_MINUTES || 45);
const EVM_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "../dist");

const DEFAULT_EVM_RPC_URLS = {
  erc20: "https://ethereum-rpc.publicnode.com",
  bep20: "https://bsc-rpc.publicnode.com",
} as const;

const DEFAULT_USDT_CONTRACTS = {
  trc20: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  erc20: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  bep20: "0x55d398326f99059ff775485246999027b3197955",
} as const;

function loadFirebaseAppletConfig(): FirebaseAppletConfig {
  const raw = fs.readFileSync(new URL("../firebase-applet-config.json", import.meta.url), "utf-8");
  return JSON.parse(raw) as FirebaseAppletConfig;
}

const firebaseAppletConfig = loadFirebaseAppletConfig();
const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId || "(default)";

function loadServiceAccount(): admin.ServiceAccount {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const raw = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf-8");
    return JSON.parse(raw);
  }
  throw new Error(
    "Provide FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH",
  );
}

if (admin.apps.length === 0) {
  const serviceAccount = loadServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const firestore = getFirestore(admin.app(), FIRESTORE_DATABASE_ID);

function buildPaymentNetworks(): Record<PaymentNetworkId, PaymentNetworkConfig> {
  return {
    trc20: {
      id: "trc20",
      label: "USDT (TRC20)",
      kind: "tron",
      walletAddress: (process.env.PAYMENTS_WALLET_TRC20 || "").trim(),
      explorerTxBaseUrl: "https://tronscan.org/#/transaction/",
      confirmationsRequired: Number(process.env.PAYMENTS_TRC20_CONFIRMATIONS || 1),
      contractAddress: (
        process.env.PAYMENTS_USDT_CONTRACT_TRC20 || DEFAULT_USDT_CONTRACTS.trc20
      ).trim(),
    },
    erc20: {
      id: "erc20",
      label: "USDT (ERC20)",
      kind: "evm",
      walletAddress: normalizeEvmAddress(process.env.PAYMENTS_WALLET_ERC20 || ""),
      explorerTxBaseUrl: "https://etherscan.io/tx/",
      confirmationsRequired: Number(process.env.PAYMENTS_ERC20_CONFIRMATIONS || 12),
      contractAddress: normalizeEvmAddress(
        process.env.PAYMENTS_USDT_CONTRACT_ERC20 || DEFAULT_USDT_CONTRACTS.erc20,
      ),
      rpcUrl: (process.env.PAYMENTS_ETH_RPC_URL || DEFAULT_EVM_RPC_URLS.erc20).trim(),
    },
    bep20: {
      id: "bep20",
      label: "USDT (BEP20)",
      kind: "evm",
      walletAddress: normalizeEvmAddress(process.env.PAYMENTS_WALLET_BEP20 || ""),
      explorerTxBaseUrl: "https://bscscan.com/tx/",
      confirmationsRequired: Number(process.env.PAYMENTS_BEP20_CONFIRMATIONS || 3),
      contractAddress: normalizeEvmAddress(
        process.env.PAYMENTS_USDT_CONTRACT_BEP20 || DEFAULT_USDT_CONTRACTS.bep20,
      ),
      rpcUrl: (process.env.PAYMENTS_BSC_RPC_URL || DEFAULT_EVM_RPC_URLS.bep20).trim(),
    },
  };
}

const PAYMENT_NETWORKS = buildPaymentNetworks();

function isLocalOrigin(origin: string | undefined) {
  return Boolean(origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin));
}

const app = express();
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (isLocalOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }

  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});
app.use(express.json({ limit: "1mb" }));

app.post("/api/auth/dev-email-verification-link", async (req: Request, res: Response) => {
  const origin = req.headers.origin;

  if (!isLocalOrigin(origin)) {
    return res.status(403).json({ error: "Dev verification link is only available on localhost." });
  }

  const { email, continueUrl } = (req.body || {}) as DevVerificationLinkRequest;
  const normalizedEmail = (email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const user = await admin.auth().getUserByEmail(normalizedEmail);

    if (user.emailVerified) {
      return res.json({ alreadyVerified: true });
    }

    const actionUrl =
      typeof continueUrl === "string" && continueUrl.trim()
        ? continueUrl.trim()
        : `${origin}/auth?mode=login&verified=1`;

    const link = await admin.auth().generateEmailVerificationLink(normalizedEmail, {
      url: actionUrl,
      handleCodeInApp: false,
    });

    return res.json({
      email: normalizedEmail,
      link,
      alreadyVerified: false,
    });
  } catch (error: any) {
    console.error("Failed to generate dev verification link:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate verification link.",
    });
  }
});

function normalizeEvmAddress(address: string) {
  const trimmed = address.trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function toTopicAddress(address: string) {
  return `0x${normalizeEvmAddress(address).slice(2).padStart(64, "0")}`;
}

function toNumber(value: unknown, decimals = 6) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  if (value.includes(".")) return Number(value);
  const parsed = BigInt(value);
  return Number(parsed) / 10 ** decimals;
}

function roundAmount(value: number, decimals = 3) {
  return Number(value.toFixed(decimals));
}

function almostEqual(left: number, right: number, tolerance = 0.000001) {
  return Math.abs(left - right) <= tolerance;
}

function timestampToDate(value?: admin.firestore.Timestamp | null) {
  if (!value) return null;
  return value.toDate();
}

function getEnabledPaymentNetworks() {
  return Object.values(PAYMENT_NETWORKS).filter((network) => {
    if (!network.walletAddress) return false;
    if (network.kind === "evm") {
      return Boolean(network.rpcUrl);
    }
    return true;
  });
}

function generateUniqueFraction() {
  return crypto.randomInt(1, 1000) / 1000;
}

function generatePaymentReference() {
  return `DEP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function maskAddress(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function normalizeSocialUsername(value: string) {
  return value.trim().replace(/^@/, "").replace(/\/+$/, "");
}

function isSupportedSocialHost(platform: SocialPlatformId, hostname: string) {
  const normalizedHost = hostname.toLowerCase();

  switch (platform) {
    case "tiktok":
      return normalizedHost === "www.tiktok.com" || normalizedHost === "tiktok.com" || normalizedHost.endsWith(".tiktok.com");
    case "instagram":
      return normalizedHost === "www.instagram.com" || normalizedHost === "instagram.com" || normalizedHost.endsWith(".instagram.com");
    case "youtube":
      return (
        normalizedHost === "www.youtube.com" ||
        normalizedHost === "youtube.com" ||
        normalizedHost === "m.youtube.com" ||
        normalizedHost === "youtu.be"
      );
    default:
      return false;
  }
}

function buildSocialProfileUrl(platform: SocialPlatformId, username: string) {
  const cleanUsername = normalizeSocialUsername(username);

  switch (platform) {
    case "tiktok":
      return `https://www.tiktok.com/@${cleanUsername}`;
    case "instagram":
      return `https://www.instagram.com/${cleanUsername}/`;
    case "youtube":
      return `https://www.youtube.com/@${cleanUsername}`;
    default:
      throw new Error("Unsupported platform.");
  }
}

function resolveSocialProfileUrl(
  platform: SocialPlatformId,
  rawUrl: string | undefined,
  username: string,
) {
  const trimmedUrl = (rawUrl || "").trim();

  if (!trimmedUrl) {
    if (!username) {
      throw new Error("Username is required.");
    }

    return buildSocialProfileUrl(platform, username);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    throw new Error("Profile URL is invalid.");
  }

  if (!isSupportedSocialHost(platform, parsedUrl.hostname)) {
    throw new Error("Profile URL does not match the selected platform.");
  }

  return parsedUrl.toString();
}

async function fetchSocialProfileHtml(platform: SocialPlatformId, profileUrl: string) {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };

  if (platform === "youtube") {
    headers.Cookie = "CONSENT=YES+cb.20210328-17-p0.en+FX+667";
  }

  const response = await fetch(profileUrl, {
    method: "GET",
    headers,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Profile check failed with status ${response.status}.`);
  }

  return response.text();
}

function profileContainsVerificationCode(html: string, verificationCode: string) {
  return html.toLowerCase().includes(verificationCode.trim().toLowerCase());
}

function paymentDto(paymentId: string, payment: PaymentDocument) {
  return {
    id: paymentId,
    ...payment,
    createdAt: payment.createdAt?.toDate()?.toISOString() || null,
    updatedAt: payment.updatedAt?.toDate()?.toISOString() || null,
    expiresAt: payment.expiresAt?.toDate()?.toISOString() || null,
    markedPaidAt: payment.markedPaidAt?.toDate()?.toISOString() || null,
    confirmedAt: payment.confirmedAt?.toDate()?.toISOString() || null,
  };
}

type PaymentDto = ReturnType<typeof paymentDto>;

function getPaymentSortValue(payment: PaymentDocument) {
  return (
    timestampToDate(payment.updatedAt)?.getTime() ||
    timestampToDate(payment.createdAt)?.getTime() ||
    0
  );
}

function getPaymentDtoSortValue(payment: {
  createdAt?: string | null;
  updatedAt?: string | null;
}) {
  return (
    Date.parse(payment.updatedAt || "") ||
    Date.parse(payment.createdAt || "") ||
    0
  );
}

async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.auth = await admin.auth().verifyIdToken(token);
    return next();
  } catch (error) {
    console.error("Auth verification error:", error);
    return res.status(401).json({ error: "Invalid auth token" });
  }
}

app.post("/api/social/verify-ownership", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { platform, username, url, code } = (req.body || {}) as VerifySocialOwnershipRequest;

  if (!platform || !["tiktok", "instagram", "youtube"].includes(platform)) {
    return res.status(400).json({ error: "Unsupported social platform." });
  }

  const verificationCode = (code || "").trim();
  const normalizedUsername = normalizeSocialUsername(username || "");

  if (!verificationCode || verificationCode.length < 6) {
    return res.status(400).json({ error: "Verification code is required." });
  }

  try {
    const profileUrl = resolveSocialProfileUrl(platform, url, normalizedUsername);
    const html = await fetchSocialProfileHtml(platform, profileUrl);
    const verified = profileContainsVerificationCode(html, verificationCode);

    return res.json({
      verified,
      platform,
      username: normalizedUsername,
      profileUrl,
      reason: verified
        ? null
        : "Код не найден на публичной странице профиля. Обновите bio/описание, убедитесь что аккаунт открыт, и попробуйте снова через 15-30 секунд.",
    });
  } catch (error: any) {
    console.error("Failed to verify social ownership:", error);
    return res.status(500).json({
      error: error?.message || "Failed to verify social ownership.",
    });
  }
});

async function evmRpc<T>(rpcUrl: string, method: string, params: unknown[]) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const payload = (await response.json()) as {
    result?: T;
    error?: { message?: string };
  };

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `RPC error: ${method}`);
  }

  return payload.result as T;
}

async function getLatestEvmBlockNumber(rpcUrl: string) {
  const result = await evmRpc<string>(rpcUrl, "eth_blockNumber", []);
  return Number.parseInt(result, 16);
}

async function findEvmPaymentTransfer(
  payment: PaymentDocument,
  network: PaymentNetworkConfig,
) {
  const rpcUrl = network.rpcUrl;
  if (!rpcUrl) {
    throw new Error(`RPC URL is not configured for ${network.label}`);
  }

  const latestBlock = await getLatestEvmBlockNumber(rpcUrl);
  const createdBlockNumber = payment.createdBlockNumber || latestBlock;
  const fromBlock = Math.max(createdBlockNumber - 20, 0);

  const logs = await evmRpc<any[]>(rpcUrl, "eth_getLogs", [
    {
      address: normalizeEvmAddress(network.contractAddress),
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: `0x${latestBlock.toString(16)}`,
      topics: [EVM_TRANSFER_TOPIC, null, toTopicAddress(network.walletAddress)],
    },
  ]);

  const matchedLog = logs.find((log) =>
    almostEqual(toNumber(log?.data || "0x0", 6), payment.payableAmount),
  );

  if (!matchedLog) {
    return null;
  }

  const receipt = await evmRpc<any>(rpcUrl, "eth_getTransactionReceipt", [
    matchedLog.transactionHash,
  ]);

  const receiptBlockNumber = receipt?.blockNumber
    ? Number.parseInt(receipt.blockNumber, 16)
    : latestBlock;
  const confirmations = latestBlock - receiptBlockNumber + 1;
  const succeeded =
    receipt?.status === "0x1" || receipt?.status === "0x01" || receipt?.status === 1;

  return {
    status:
      succeeded && confirmations >= network.confirmationsRequired
        ? ("completed" as const)
        : ("processing" as const),
    txHash: matchedLog.transactionHash,
    explorerUrl: `${network.explorerTxBaseUrl}${matchedLog.transactionHash}`,
  };
}

async function findTronPaymentTransfer(
  payment: PaymentDocument,
  network: PaymentNetworkConfig,
) {
  const url = new URL(
    `https://api.trongrid.io/v1/accounts/${network.walletAddress}/transactions/trc20`,
  );
  url.searchParams.set("limit", "200");
  url.searchParams.set("only_confirmed", "false");

  const minTimestamp = timestampToDate(payment.createdAt)?.getTime();
  if (minTimestamp) {
    url.searchParams.set("min_timestamp", String(minTimestamp - 60_000));
  }

  const headers: HeadersInit = {};
  if (process.env.TRONGRID_API_KEY) {
    headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
  }

  const response = await fetch(url, { headers });
  const payload = (await response.json()) as {
    data?: any[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || "TRON Grid request failed");
  }

  const transfers = Array.isArray(payload.data) ? payload.data : [];
  const matchedTransfer = transfers.find((transfer) => {
    const transferTo = String(transfer.to || transfer.to_address || "").trim();
    const tokenAddress = String(
      transfer.token_info?.address || transfer.token_info?.id || "",
    )
      .trim()
      .toLowerCase();
    const amount = toNumber(
      transfer.value ?? "0",
      Number(transfer.token_info?.decimals || 6),
    );

    return (
      transferTo === network.walletAddress &&
      tokenAddress === network.contractAddress.toLowerCase() &&
      almostEqual(amount, payment.payableAmount)
    );
  });

  if (!matchedTransfer) {
    return null;
  }

  const txHash =
    matchedTransfer.transaction_id ||
    matchedTransfer.transactionHash ||
    matchedTransfer.id ||
    null;
  const confirmed = matchedTransfer.confirmed !== false;

  return {
    status: confirmed ? ("completed" as const) : ("processing" as const),
    txHash,
    explorerUrl: txHash ? `${network.explorerTxBaseUrl}${txHash}` : null,
  };
}

async function completePayment(
  paymentRef: admin.firestore.DocumentReference,
  result: { txHash?: string | null; explorerUrl?: string | null },
) {
  await firestore.runTransaction(async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef);
    if (!paymentSnap.exists) {
      throw new Error("Payment not found");
    }

    const payment = paymentSnap.data() as PaymentDocument;
    if (payment.status === "completed" && payment.balanceAppliedAt) {
      return;
    }

    transaction.update(paymentRef, {
      status: "completed",
      txHash: result.txHash || payment.txHash || null,
      explorerUrl: result.explorerUrl || payment.explorerUrl || null,
      note: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      balanceAppliedAt:
        payment.balanceAppliedAt || admin.firestore.FieldValue.serverTimestamp(),
    });

    if (!payment.balanceAppliedAt) {
      transaction.update(firestore.collection("users").doc(payment.userId), {
        balance: admin.firestore.FieldValue.increment(payment.payableAmount),
      });
    }
  });
}

async function createDepositPayment(
  userId: string,
  networkId: PaymentNetworkId,
  amount: number,
  retryOf?: string | null,
) {
  const network = PAYMENT_NETWORKS[networkId];
  if (!network || !network.walletAddress) {
    throw new Error("Network is not configured");
  }

  const requestedAmount = roundAmount(amount, 2);
  const payableAmount = roundAmount(requestedAmount + generateUniqueFraction(), 3);
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60_000),
  );

  let createdBlockNumber: number | null = null;
  if (network.kind === "evm" && network.rpcUrl) {
    createdBlockNumber = await getLatestEvmBlockNumber(network.rpcUrl);
  }

  const paymentRef = await firestore.collection("payments").add({
    userId,
    type: "deposit",
    status: "pending",
    network: network.id,
    networkLabel: network.label,
    address: network.walletAddress,
    requestedAmount,
    payableAmount,
    reference: generatePaymentReference(),
    note: "Переведите точную сумму и затем нажмите 'Я оплатил'.",
    retryOf: retryOf || null,
    txHash: null,
    explorerUrl: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    markedPaidAt: null,
    confirmedAt: null,
    balanceAppliedAt: null,
    createdBlockNumber,
  });

  const paymentSnap = await paymentRef.get();
  return paymentDto(paymentRef.id, paymentSnap.data() as PaymentDocument);
}

async function syncPaymentStatus(
  paymentId: string,
  userId: string,
  options: { markPaid?: boolean } = {},
) {
  const paymentRef = firestore.collection("payments").doc(paymentId);
  const paymentSnap = await paymentRef.get();

  if (!paymentSnap.exists) {
    throw new Error("Payment not found");
  }

  const payment = paymentSnap.data() as PaymentDocument;
  if (payment.userId !== userId) {
    throw new Error("Access denied");
  }

  if (payment.status === "completed") {
    return paymentDto(paymentId, payment);
  }

  const network = PAYMENT_NETWORKS[payment.network];
  if (!network || !network.walletAddress) {
    throw new Error("Network is not configured");
  }

  if (options.markPaid && payment.status === "pending") {
    await paymentRef.update({
      status: "processing",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      markedPaidAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    payment.status = "processing";
  }

  const result =
    network.kind === "evm"
      ? await findEvmPaymentTransfer(payment, network)
      : await findTronPaymentTransfer(payment, network);

  if (result?.status === "completed") {
    await completePayment(paymentRef, result);
    const completedSnap = await paymentRef.get();
    return paymentDto(paymentId, completedSnap.data() as PaymentDocument);
  }

  const expiresAt = timestampToDate(payment.expiresAt);
  const isExpired = expiresAt ? expiresAt.getTime() <= Date.now() : false;
  const nextStatus = isExpired
    ? ("cancelled" as const)
    : result?.status || (payment.status === "processing" ? "processing" : "pending");

  await paymentRef.update({
    status: nextStatus,
    txHash: result?.txHash || payment.txHash || null,
    explorerUrl: result?.explorerUrl || payment.explorerUrl || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const updatedSnap = await paymentRef.get();
  return paymentDto(paymentId, updatedSnap.data() as PaymentDocument);
}

app.get("/api/payments/config", requireAuth, async (_req, res) => {
  const networks = getEnabledPaymentNetworks().map((network) => ({
    id: network.id,
    label: network.label,
    enabled: true,
    maskedAddress: maskAddress(network.walletAddress),
  }));

  return res.json({
    networks,
    minimumAmount: PAYMENT_MIN_AMOUNT,
    expiryMinutes: PAYMENT_EXPIRY_MINUTES,
  });
});

app.get("/api/payments", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.auth?.uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const snapshot = await firestore
      .collection("payments")
      .where("userId", "==", req.auth.uid)
      .get();

    const paymentEntries = snapshot.docs
      .map((paymentDoc) => ({
        id: paymentDoc.id,
        payment: paymentDoc.data() as PaymentDocument,
      }))
      .sort((left, right) => getPaymentSortValue(right.payment) - getPaymentSortValue(left.payment));

    const syncedPayments = await Promise.all(
      paymentEntries
        .filter(({ payment }) => ["pending", "processing"].includes(payment.status))
        .slice(0, 8)
        .map(async ({ id }) => {
          try {
            return await syncPaymentStatus(id, req.auth!.uid);
          } catch (error) {
            console.error(`Payment sync failed for ${id}:`, error);
            return null;
          }
        }),
    );

    const syncedById = new Map(
      syncedPayments
        .filter((payment): payment is PaymentDto => Boolean(payment))
        .map((payment) => [payment.id, payment]),
    );

    const payments = paymentEntries
      .map(({ id, payment }) => syncedById.get(id) || paymentDto(id, payment))
      .sort((left, right) => getPaymentDtoSortValue(right) - getPaymentDtoSortValue(left));

    return res.json({ payments });
  } catch (error: any) {
    console.error("Get payments error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

app.post("/api/payments/deposits", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const amount = Number(req.body?.amount || 0);
    const network = String(req.body?.network || "") as PaymentNetworkId;

    if (!req.auth?.uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!Number.isFinite(amount) || amount < PAYMENT_MIN_AMOUNT) {
      return res.status(400).json({
        error: `Минимальная сумма пополнения ${PAYMENT_MIN_AMOUNT} USDT`,
      });
    }

    if (!PAYMENT_NETWORKS[network]) {
      return res.status(400).json({ error: "Unsupported network" });
    }

    const payment = await createDepositPayment(req.auth.uid, network, amount);
    return res.status(201).json({ payment });
  } catch (error: any) {
    console.error("Create deposit error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

app.post(
  "/api/payments/deposits/:paymentId/mark-paid",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.auth?.uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const payment = await syncPaymentStatus(req.params.paymentId, req.auth.uid, {
        markPaid: true,
      });

      return res.json({ payment });
    } catch (error: any) {
      console.error("Mark paid error:", error);
      return res.status(400).json({ error: error.message || "Server error" });
    }
  },
);

app.post(
  "/api/payments/:paymentId/check",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.auth?.uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const payment = await syncPaymentStatus(req.params.paymentId, req.auth.uid);
      return res.json({ payment });
    } catch (error: any) {
      console.error("Check payment error:", error);
      return res.status(400).json({ error: error.message || "Server error" });
    }
  },
);

app.post(
  "/api/payments/:paymentId/retry",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.auth?.uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const paymentRef = firestore.collection("payments").doc(req.params.paymentId);
      const paymentSnap = await paymentRef.get();

      if (!paymentSnap.exists) {
        return res.status(404).json({ error: "Payment not found" });
      }

      const payment = paymentSnap.data() as PaymentDocument;
      if (payment.userId !== req.auth.uid) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!["cancelled", "processing"].includes(payment.status)) {
        return res.status(400).json({
          error: "Повтор платежа доступен только для отмененных или обрабатываемых платежей",
        });
      }

      const retriedPayment = await createDepositPayment(
        req.auth.uid,
        payment.network,
        payment.requestedAmount,
        req.params.paymentId,
      );

      return res.status(201).json({ payment: retriedPayment });
    } catch (error: any) {
      console.error("Retry payment error:", error);
      return res.status(400).json({ error: error.message || "Server error" });
    }
  },
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));

  app.get(/^(?!\/api(?:\/|$)|\/health$).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`ADROP server listening on http://localhost:${PORT}`);
});
