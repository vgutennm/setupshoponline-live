import { one, run, database } from "./db.mjs";
import { handleGrowth } from "./growth.mjs";
import { configured, payload, sendJob, processDue, pdfBytes, FILE_NAME } from "./emails.mjs";
const COOKIE = "workbook_access";
const PUBLIC_ORIGINS = new Set(["https://setupshoponline.vlad554726.chatgpt.site", "https://setupshoponline.com", "https://www.setupshoponline.com"]);
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", ...headers } });
async function hash(value) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, "0")).join(""); }
function cookieToken(request) { return (request.headers.get("cookie") || "").split(";").map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || ""; }
function cookie(token, url) { return `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${url.protocol === "https:" ? "; Secure" : ""}`; }
function randomToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join(""); }
function validOrigin(request, env) {
  const url = new URL(request.url);
  return request.headers.get("origin") === url.origin && (PUBLIC_ORIGINS.has(url.origin) || env.LOCAL_PREVIEW === true && ["127.0.0.1", "localhost"].includes(url.hostname));
}
async function consumeRate(env, key, limit, windowMs) {
  const now = Date.now(), bucket = Math.floor(now / windowMs);
  const result = await one(env, "INSERT INTO workbook_rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count", `${key}:${bucket}`, (bucket + 1) * windowMs);
  return result.count <= limit;
}
async function subscriber(request, env) {
  if (!validOrigin(request, env)) return json({ error: "Please submit the form from this website." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Please submit the form again." }, 415);
  if (Number(request.headers.get("content-length")) > 8192) return json({ error: "Your form is too long." }, 413);
  const raw = await request.text();
  if (raw.length > 8192) return json({ error: "Your form is too long." }, 413);
  let data; try { data = JSON.parse(raw); } catch { return json({ error: "Please check the form and try again." }, 400); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return json({ error: "Please check the form and try again." }, 400);
  if (data.website || !Number.isFinite(data.started_at) || Date.now() - data.started_at < 1200 || Date.now() - data.started_at > 24*3600_000) return json({ error: "Please wait a moment and submit the form again." }, 400);
  const clean = key => typeof data[key] === "string" ? data[key].trim() : "";
  const name = clean("full_name"), email = clean("email").toLowerCase(), phone = clean("phone"), id = clean("submission_id");
  const fields = {};
  if (data.human_confirmed !== true) fields.human_confirmed = "Please confirm that you are human before continuing.";
  if (name.length < 2 || name.length > 120 || /[\x00-\x1f\x7f]/.test(name)) fields.full_name = "Please enter your full name.";
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email)) fields.email = "Please enter a valid email address.";
  if (/[\x00-\x1f\x7f]/.test(phone) || phone.length > 40 || !/^[+\d\s().-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15) fields.phone = "Please enter a phone number with 7–15 digits.";
  if (Object.keys(fields).length) return json({ error: "Please check the highlighted fields.", fields }, 400);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Please refresh the form and try again." }, 400);
  const requestHash = await hash(JSON.stringify([name, email, phone]));
  const existing = await one(env, "SELECT * FROM workbook_leads WHERE id=?", id);
  const url = new URL(request.url);
  if (existing) {
    if (existing.request_hash !== requestHash) return json({ error: "This request was already saved with different details. Please refresh the form." }, 409);
    // Only return access to the original request. Never expose or derive a saved download token.
    const token = cookieToken(request);
    if (token && await hash(token) === existing.download_hash) return json({ saved: true });
    // A failed response may have lost the cookie; an unguessable submission UUID and matching payload recover access.
    const savedEmail = await one(env, "SELECT payload FROM workbook_email_jobs WHERE id=?", `${id}-subscriber`);
    const nextToken = savedEmail?.payload.match(/workbook-access#([0-9a-f]{64})/)?.[1];
    if (!nextToken) return json({ error: "Your request is still being prepared. Please try again in a moment." }, 409);
    return json({ saved: true }, 200, { "Set-Cookie": cookie(nextToken, url) });
  }
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const day = new Date().toISOString().slice(0,10);
  const ipHash = await hash(`${day}:${ip}`);
  if (!await consumeRate(env, `ip:${ipHash}`, 8, 3600_000) || !await consumeRate(env, `email:${await hash(email)}`, 3, 24*3600_000)) return json({ error: "Too many requests. Please try again later, or email vlad@setupshoponline.com for help." }, 429);
  const campaign = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) if (typeof data.campaign?.[key] === "string" && data.campaign[key]) campaign[key] = data.campaign[key].replace(/[\x00-\x1f\x7f]/g, "").slice(0, 200);
  let timezone = clean("timezone").slice(0,100) || "UTC";
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }); } catch { timezone = "UTC"; }
  const token = randomToken();
  const lead = { id, full_name: name, email, phone, submitted_at: new Date().toISOString(), timezone, source_page: "/free-workbook", campaign_json: JSON.stringify(campaign) };
  const downloadUrl = `${url.origin}/workbook-access#${token}`;
  const initialStatus = configured(env) ? "pending" : "not_configured";
  const subscriberPayload = payload("subscriber", lead, downloadUrl, initialStatus, env);
  const notificationPayload = payload("notification", lead, downloadUrl, initialStatus, env);
  const db = database(env);
  // Lead and durable email jobs are one transaction: either all persist or none do.
  try {
    await db.batch([
      db.prepare("INSERT INTO workbook_leads (id,request_hash,full_name,email,phone,submitted_at,timezone,source_page,campaign_json,consent_version,download_hash,is_test) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(id, requestHash, name, email, phone, lead.submitted_at, timezone, lead.source_page, lead.campaign_json, "workbook-2026-09-28", await hash(token), name.startsWith("[TEST]") && email === "vlad@setupshoponline.com" ? 1 : 0),
      db.prepare("INSERT INTO workbook_email_jobs (id,lead_id,kind,payload,status,attempts,next_attempt,lock_until) VALUES (?,?,?,?,?,0,0,0)").bind(`${id}-subscriber`, id, "subscriber", JSON.stringify(subscriberPayload), initialStatus),
      db.prepare("INSERT INTO workbook_email_jobs (id,lead_id,kind,payload,status,attempts,next_attempt,lock_until) VALUES (?,?,?,?,?,0,0,0)").bind(`${id}-notification`, id, "notification", JSON.stringify(notificationPayload), initialStatus),
    ]);
  } catch {
    const duplicate = await one(env, "SELECT id FROM workbook_leads WHERE id=?", id);
    if (duplicate) return json({ error: "Your request is being saved. Please try again in a moment." }, 409);
    throw new Error("save_failed");
  }
  let emailStatus = initialStatus;
  try {
    emailStatus = await sendJob(env, `${id}-subscriber`);
    await sendJob(env, `${id}-notification`);
  } catch { /* The saved lead and download remain available if mail is unavailable. */ }
  return json({ saved: true, email_status: emailStatus }, 200, { "Set-Cookie": cookie(token, url) });
}
async function leadForRequest(request, env) {
  const token = cookieToken(request);
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  return one(env, "SELECT id FROM workbook_leads WHERE download_hash=?", await hash(token));
}
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (/^\/free-growth-strategy(?:\.html)?\/?$/.test(url.pathname)) return Response.redirect(new URL("/free-business-strategy"+url.search,url.origin),301);
    try {
      if (url.pathname.startsWith("/api/alignable-kit/")) {
        if (url.pathname === "/api/alignable-kit/config") return json({ preview: true, checkoutEnabled: false, bookingVerified: true });
        return json({ error: "This is a review preview. Production checkout is not enabled here." }, 503);
      }
      if (url.pathname.startsWith("/api/conversionkit/")) {
        if (url.pathname === "/api/conversionkit/config" && request.method === "GET") return json({ preview: true, emailEnabled: false, recaptchaSiteKey: "" });
        return json({ error: "Please request the kit on setupshoponline.com/conversionkit.", ready: false }, 403);
      }
      const growth = await handleGrowth(request, env, ctx);
      if (growth) return growth;
      if (url.pathname.startsWith("/api/workbook/")) {
        if (url.pathname === "/api/workbook/config" && request.method === "GET") return json({ emailEnabled: configured(env) });
        if (url.pathname === "/api/workbook/subscribe" && request.method === "POST") return await subscriber(request, env);
        if (url.pathname === "/api/workbook/access" && request.method === "POST") {
          if (!validOrigin(request, env)) return json({ error: "Invalid request." }, 403);
          const text = await request.text(); if (text.length > 200) return json({ error: "Invalid link." }, 400);
          let token; try { token = JSON.parse(text).token; } catch { return json({ error: "Invalid link." }, 400); }
          if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token) || !await one(env, "SELECT id FROM workbook_leads WHERE download_hash=?", await hash(token))) return json({ error: "This link is not valid. Please request the workbook again." }, 403);
          return json({ ready: true }, 200, { "Set-Cookie": cookie(token, url) });
        }
        if (url.pathname === "/api/workbook/session" && request.method === "GET") {
          const lead = await leadForRequest(request, env);
          if (!lead) return json({ ready: false });
          const job = await one(env, "SELECT status FROM workbook_email_jobs WHERE id=?", `${lead.id}-subscriber`);
          if (ctx?.waitUntil) ctx.waitUntil(processDue(env).catch(() => {}));
          return json({ ready: true, email_status: job?.status || "not_configured" });
        }
        if (url.pathname === "/api/workbook/download" && ["GET", "HEAD"].includes(request.method)) {
          if (!await leadForRequest(request, env)) return json({ error: "Please request the workbook through the form first." }, 403);
          return new Response(request.method === "HEAD" ? null : pdfBytes(), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${FILE_NAME}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
        }
        return json({ error: "Not found." }, 404);
      }
      if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method not allowed." }, 405);
      if (ctx?.waitUntil && configured(env)) ctx.waitUntil(processDue(env).catch(() => {}));
      if (!env.ASSETS) return new Response("Site is temporarily unavailable.", { status: 503 });
      const result = await env.ASSETS.fetch(request);
      if (result.status !== 404 || url.pathname.includes(".")) return result;
      const fallback = new URL("/index.html", url.origin);
      return env.ASSETS.fetch(new Request(fallback, request));
    } catch {
      return json({ error: "We could not save or retrieve your workbook right now. Please try again. Your form details are still on this page." }, 503);
    }
  },
};
