import { authorizeSender, createSupabaseAdminClient, jsonResponse } from "../_shared/gridster.js";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function onRequestPost({ request, env }) {
  const authorization = authorizeSender(request, env);

  if (!authorization.ok) {
    return jsonResponse(authorization.status, { error: authorization.error }, NO_STORE_HEADERS);
  }

  let payload = {};

  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Request body must be valid JSON." }, NO_STORE_HEADERS);
  }

  const id = String(payload.id || "").trim();
  const status = payload.status === "failed" ? "failed" : "sent";
  const avatarUuid = String(payload.avatarUuid || payload.avatar_uuid || "").trim();

  if (!id) {
    return jsonResponse(400, { error: "Missing verification id." }, NO_STORE_HEADERS);
  }

  const supabaseAdmin = createSupabaseAdminClient(env);

  if (!supabaseAdmin) {
    return jsonResponse(500, { error: "Gridster avatar verification is not configured yet." }, NO_STORE_HEADERS);
  }

  const updatePayload = { status };

  if (status === "sent" && avatarUuid) {
    updatePayload.avatar_uuid = avatarUuid;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("sl_verification_codes")
      .update(updatePayload)
      .eq("id", id)
      .eq("status", "pending")
      .select("id, status")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return jsonResponse(
        404,
        { error: "No pending verification code was found for that id." },
        NO_STORE_HEADERS
      );
    }

    return jsonResponse(200, { id: data.id, status: data.status }, NO_STORE_HEADERS);
  } catch (error) {
    console.error("Failed to mark SL verification delivery", error);

    return jsonResponse(500, { error: "Could not update verification delivery status." }, NO_STORE_HEADERS);
  }
}
