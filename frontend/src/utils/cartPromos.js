export function getCartItemPrice(item) {
  return item.oferta && item.precio_oferta ? Number(item.precio_oferta) : Number(item.precio);
}

export function getPromoPairs(cartItems) {
  const itemsById = new Map(cartItems.map((item) => [Number(item.id), item]));
  const processedPairs = new Set();

  return cartItems
    .map((item) => {
      const partnerId = Number(item.promo_2x1_partner_id);
      const partner = itemsById.get(partnerId);

      if (!item.promo_2x1 || !partner) {
        return null;
      }

      const pairKey = [Number(item.id), partnerId].sort((first, second) => first - second).join("-");
      if (processedPairs.has(pairKey)) {
        return null;
      }

      processedPairs.add(pairKey);
      const pairs = Math.min(Number(item.quantity || 0), Number(partner.quantity || 0));
      if (pairs <= 0) {
        return null;
      }

      const freeUnitPrice = Math.min(getCartItemPrice(item), getCartItemPrice(partner));

      return {
        key: pairKey,
        first: item,
        partner,
        pairs,
        discount: freeUnitPrice * pairs,
        label: `2x1: ${item.titulo} + ${partner.titulo}`,
      };
    })
    .filter(Boolean);
}

export function calculateCartSummary(cartItems) {
  const subtotal = cartItems.reduce((sum, item) => sum + getCartItemPrice(item) * item.quantity, 0);
  const totalUnits = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const promoPairs = getPromoPairs(cartItems);
  const promoBookIds = new Set(
    promoPairs.flatMap((pair) => [Number(pair.first.id), Number(pair.partner.id)]),
  );
  const promoDiscountAmount = promoPairs.reduce((sum, pair) => sum + pair.discount, 0);
  const discountEligibleItems = cartItems.filter((item) => !promoBookIds.has(Number(item.id)));
  const discountEligibleUnits = discountEligibleItems.reduce((sum, item) => sum + item.quantity, 0);
  const discountEligibleBase = discountEligibleItems.reduce(
    (sum, item) => sum + getCartItemPrice(item) * item.quantity,
    0,
  );
  const discountRate = discountEligibleUnits >= 3 ? 0.2 : discountEligibleUnits === 2 ? 0.15 : 0;
  const discountAmount = discountEligibleBase * discountRate;

  return {
    subtotal,
    total_units: totalUnits,
    discount_eligible_units: discountEligibleUnits,
    discount_rate: discountRate,
    discount_amount: discountAmount,
    promo_discount_amount: promoDiscountAmount,
    promotions: promoPairs.map((pair) => ({
      label: pair.label,
      pairs: pair.pairs,
      discount: pair.discount,
    })),
    total: subtotal - promoDiscountAmount - discountAmount,
    isEstimate: true,
  };
}
