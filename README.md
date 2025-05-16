# montonio-js

This package allows you to integrate the Montonio checkout experience into your store's front-end, enabling your customers to pay with payment methods provided by Montonio.

This is a front-end library. Server-side code and configuration is required to complete the integration. Please visit the [Montonio Documentation](https://docs.montonio.com/) for full integration guides.

# Installation

We support installation both as a JavaScript module (ESM) and as an embedded script tag (UMD).

## ES Module

1. Install the package using npm or yarn:
```bash
npm install @montonio/montonio-js
```
2. Import the library in your JavaScript code:
```javascript
import { loadMontonioCheckout } from '@montonio/montonio-js';
```

## Embedded script tag

To embed the classic UMD version of the library, you can include the following script tag in your HTML file:

```html
<script src="https://js.montonio.com/1.x.x/montonio.umd.js"></script>
```

In this case, the library and its components will be available in the global object `window.Montonio`:

```javascript
const { loadMontonioCheckout } = window.Montonio;
```

# Usage

## Importing components


## Embedded Payments and Checkout Sessions

To integrate Montonio's embeddable payment methods to your checkout page, you first need to create a Montonio Checkout Session on your server. Follow the [Montonio Documentation](https://docs.montonio.com/) to create a session. Once you have the session UUID, you can use it to initialize the `MontonioCheckout`component on your front-end.

### 1. Initialize MontonioCheckout

```javascript
import { loadMontonioCheckout } from '@montonio/montonio-js'; // ES Module usage. See above for UMD imports

const checkoutOptions = {
    checkoutSessionUuid: 'montonio-checkout-session-uuid', // The UUID of the checkout session created on your server
    mountTo: '#montonio-checkout-container', // The CSS selector of the container where the Montonio Checkout will be rendered
    environment: 'sandbox' // Defaults to 'production'
}

const montonioCheckout = await loadMontonioCheckout(checkoutOptions);
```

To initialize the MontonioCheckout component, the `loadMontonioCheckout` function will talk to the Montonio API to get the checkout session URL, and render the Montonio Checkout iframe in the specified container. The library will also set up a messaging channel to exchange messages between the iframe and the parent window.

The iframe will emit an event when the contents are fully loaded. The library will then resolve the promise with the `MontonioCheckout` instance, which you can use to interact with the checkout session.

### 2. Validate the payment form

Most embedded payment methods require user input (e.g. card details). As such, you should check the validity of the form before submitting it. Simply call the `validateOrReject` method on the `MontonioCheckout` instance. Catch validation errors and display them to the user.

```javascript
// User clicks the "Pay" button in your checkout form
try {
    await montonioCheckout.validateOrReject();
    // Proceed with the payment
} catch (error) {
    // Handle validation errors
}
```

The `validateOrReject` method will call the `validate` method on the Montonio Checkout iframe. If the form is valid, it will resolve. If there are validation errors, it will reject with an error object containing the validation errors.

### 3. Create the order and submit the payment

Once the user has clicked the "Pay" button in your checkout and you have validated the form, you can create the order and submit the payment. First, you need to create a Montonio Order on your server. Follow the [Montonio Documentation](https://docs.montonio.com/) to create an order.

The Montonio API will return a Payment Intent UUID, which you need to use to submit the payment.

This is done by calling the `submitPayment` method on the `MontonioCheckout` instance. The method takes the Payment Intent UUID as an argument.

```javascript
// From your backend, create the order and pass the Payment Intent UUID to the frontend
const paymentIntentUuid = 'montonio-payment-intent-uuid';

try {
    const result = await montonioCheckout.submitPayment(paymentIntentUuid);
    window.location.href = result.returnUrl; // Redirect the user to the thank you page
} catch (error) {
    // Handle errors
}
```

The `submitPayment` method will call a method on the Montonio Checkout iframe to initialize the payment process. This internal function may resolve immediately with a final success message, it may reject with an error, or it may resolve with instructions for a next action (e.g. opening a 3DS popup or redirecting the user to a bank page). The library will handle all of these cases for you, and will resolve or reject the promise accordingly.

In case of a 3DS popup, the library will render another iframe at the end of the body tag to handle the 3DS authentication. The library will also set up a messaging channel to exchange messages between this iframe and the parent window. The library will automatically close the 3DS iframe when the authentication is complete, and will finally resolve the original `submitPayment` promise with the final result of the payment process.

The final result will contain the `paymentStatus`, `orderToken`, and `returnUrl` fields. The `returnUrl` is the URL you provided in the backend request to create the order. As per the API documentation, this URL will contain the `order-token` query parameter, which you can use to validate the payment. In most cases, you should just redirect the user to the `returnUrl` and handle the token validation on that page.
