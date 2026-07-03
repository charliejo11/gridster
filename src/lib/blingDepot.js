import { supabase } from "./supabaseClient";

export async function getBlingBalance() {
  const { data, error } = await supabase.rpc("ensure_bling_balance");

  if (error) {
    throw error;
  }

  return data;
}

export async function getBlingShopData() {
  const balanceResult = await supabase.rpc("ensure_bling_balance");

  if (balanceResult.error) {
    throw balanceResult.error;
  }

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
