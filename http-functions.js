import { badRequest } from 'wix-http-functions';
import { cart, checkout } from 'wix-ecom-backend';

export async function get_metaCheckout(request) {
  try {
    const { query } = request;
    let lineItems = [];

    if (query.products) {
      const productsStr = decodeURIComponent(query.products);
      const productPairs = productsStr.split(',');
      lineItems = productPairs
        .map(pair => {
          const [catalogItemId, quantityStr] = pair.split(':');
          const quantity = parseInt(quantityStr?.trim() || '1', 10);
          return {
            catalogReference: {
              catalogItemId: catalogItemId.trim(),
              appId: '215238eb-22a5-4c36-9e7b-e7c08025e04e',
            },
            quantity,
          };
        })
        .filter(item => item.catalogReference.catalogItemId && item.quantity > 0);
    }

    if (lineItems.length === 0) {
      return badRequest({ body: 'No valid products provided' });
    }

    const newCart = await cart.createCart({
      lineItems,
      checkoutInfo: {
        channelType: 'WEB',
        channelSubtype: 'EXTERNAL',
      },
    });

    const cartId = newCart._id;

    if (query.coupon) {
      try {
        const couponCode = decodeURIComponent(query.coupon);
        // Older typings may omit support for coupons; ignore any lint error here.
        await cart.updateCart(cartId, {
          coupons: [{ code: couponCode }],
        });
      } catch (couponError) {
        console.warn('Invalid coupon (continuing without):', couponError?.message || couponError);
      }
    }

    const newCheckout = await checkout.createCheckout({
      cartId,
      options: {
        channelType: 'WEB',
        channelSubtype: 'EXTERNAL',
      },
    });

    const checkoutUrl = await checkout.getCheckoutUrl(newCheckout._id);

    return {
      status: 302,
      headers: { Location: checkoutUrl },
      body: '',
    };
  } catch (error) {
    console.error('Checkout error:', error);
    return badRequest({ body: `Error: ${error.message}` });
  }
}

