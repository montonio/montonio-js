# Montonio JS SDK

This package allows you to integrate the Montonio checkout experience into the front-end of your store, enabling your customers to pay with Montonio payment methods.

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
import { MontonioCheckout } from '@montonio/montonio-js';
```

## Embedded script tag

To embed the classic UMD version of the library, you can include the following script tag in your HTML file:

```html
<script src="https://js.montonio.com/1.x.x/montonio.umd.js"></script>
```

In this case, the library and its components will be available in the global object `window.Montonio`:

```javascript
const { MontonioCheckout } = window.Montonio;
```

# Usage

To integrate Montonio's embeddable payment methods into your checkout, you first need to create a Montonio Session on your server. Follow the [Montonio Documentation](https://docs.montonio.com/) to create a session. Once you have the session UUID, you can use it to initialize the `MontonioCheckout` component on your front-end.

### 1. Initialize MontonioCheckout

```javascript
import { MontonioCheckout } from '@montonio/montonio-js'; // ES Module usage. See above for UMD imports

const checkoutOptions = {
    sessionUuid: 'session-uuid', // The UUID of the session created on your server
    environment: 'sandbox', // Defaults to 'production'
};

const montonioCheckout = new MontonioCheckout(checkoutOptions);
await montonioCheckout.initialize('#montonio-checkout-container'); // The CSS selector string or HTMLElement of the container to mount the Montonio Checkout component
```

The `MontonioCheckout.initialize()` method will render the Montonio Checkout iframe in the specified container. You can then interact with the checkout by calling methods on the `MontonioCheckout` instance.

### 2. Validate the payment form

Most embedded payment methods require user input (e.g. card details). As such, you must check the validity of the form before submitting it. Simply call the `validateOrReject` method on the `MontonioCheckout` instance. By default, validation errors are displayed to the user already in the payment form. Optionally, you can also catch the validation errors and display them to the user yourself.

```javascript
// User clicks the "Pay" button in your checkout form
// Make sure to now lock your checkout and prevent the user from making any further changes.
try {
    await montonioCheckout.validateOrReject();
    // Proceed with the payment
} catch (error) {
    // Handle validation errors
}
```

### 3. Create the order and submit the payment

Once the user has clicked the "Pay" button in your checkout and you have validated the form, you can create the order and submit the payment. First, you need to create a Montonio Order on your server. Follow the [Montonio Documentation](https://docs.montonio.com/) to create an order. Make sure you include the session UUID in the order request.

Once the order is created, you can call the `submitPayment` method on the `MontonioCheckout` instance. 

Immediately after the user clicks "Pay" and even before you create the Montonio order, lock your checkout and prevent the user from making any further changes. Show a loading indicator to the user while the order is being created and while the payment is being submitted.

```javascript
try {
    const result = await montonioCheckout.submitPayment();
    window.location.href = result.returnUrl; // Redirect the user to the thank you page
} catch (error) {
    // Handle errors
}
```

The `MontonioCheckout.submitPayment()` method will attempt to submit the payment form and complete the payment. In case a payment method requires additional user authentication (such as 3DS for card payments), a modal will pop up to handle the authentication. The original `submitPayment` promise will be resolved when the authentication is complete, and the final result of the payment process will be returned.

The final result will contain the `paymentStatus`, `orderToken`, and `returnUrl` fields. The `returnUrl` is the URL you provided in the backend request to create the order. As per the API documentation, this URL will contain the `order-token` query parameter, which you can use to validate the payment. In most cases, you should just redirect the user to the `returnUrl` and handle the token validation on that page.
