import { supabase } from "./supabaseClient";

export const BLING_BALANCE_EVENT = "gridster:bling-balance-changed";

export function notifyBlingBalanceChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BLING_BALANCE_EVENT));
  }
}

async function getCurrentUserIsAdmin() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    return false;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.is_admin);
}

export async function getBlingBalance() {
  const { data, error } = await supabase.rpc("ensure_bling_balance");

  if (error) {
    throw error;
  }

  return data;
}

export async function getBlingBalanceSummary() {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return { balance: null, isAdmin: false };
  }

  const balanceResult = await supabase.rpc("ensure_bling_balance");

  if (balanceResult.error) {
    throw balanceResult.error;
  }

  const isAdmin = await getCurrentUserIsAdmin();

  return {
    balance: balanceResult.data?.balance ?? 0,
    isAdmin,
  };
}

export async function getBlingShopData() {
  const balanceResult = await supabase.rpc("ensure_bling_balance");

  if (balanceResult.error) {
    throw balanceResult.error;
  }

  const isAdmin = await getCurrentUserIsAdmin();

  const itemsResult = await supabase
    .from("bling_items")
    .select("*")
    .eq("is_active", true)
    .order("item_type", { ascending: true })
    .order("price", { ascending: true });

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  const purchasesResult = await supabase
    .from("bling_purchases")
    .select("item_id");

  if (purchasesResult.error) {
    throw purchasesResult.error;
  }

  const equippedResult = await supabase
    .from("equipped_cosmetics")
    .select("item_type, item_id");

  if (equippedResult.error) {
    throw equippedResult.error;
  }

  return {
    balance: balanceResult.data,
    isAdmin,
    items: itemsResult.data || [],
    purchases: purchasesResult.data || [],
    equipped: equippedResult.data || [],
  };
}

export async function buyBlingItem(itemId) {
  const { data, error } = await supabase.rpc("buy_bling_item", {
    target_item_id: itemId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function equipBlingItem(itemId) {
  const { data, error } = await supabase.rpc("equip_bling_item", {
    target_item_id: itemId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function getEquippedCosmeticsForUser(userId) {
  const { data, error } = await supabase
    .from("equipped_cosmetics")
    .select(`
      item_type,
      item_id,
      bling_items (
        id,
        slug,
        name,
        item_type,
        preview_class,
        image_url
      )
    `)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return data || [];
}
