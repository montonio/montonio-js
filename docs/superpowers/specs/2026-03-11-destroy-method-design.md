# Design: `MontonioCheckout.destroy()` Method

## Summary

Add a public `destroy()` method to `MontonioCheckout` that fully tears down an active checkout instance — unmounting the iframe, cleaning up PaymentAuth, and clearing all messaging subscriptions — while keeping the instance reusable for a subsequent `initialize()` call.

## Motivation

When `initialize()` is called multiple times without cleanup (e.g. in WooCommerce plugins or React-based apps that re-mount), orphaned iframes accumulate. These trigger timeout errors after 30000ms when the messaging service waits for `CHECKOUT_PAYMENT_COMPONENT_READY` from an iframe that was never properly mounted. A public `destroy()` gives integrators an explicit cleanup hook to call before re-initializing.

## Changes

### 1. `BaseComponent` — fix unsafe null check in `cleanup()`

`cleanup()` currently calls `if (this.iframe)`, but the `iframe` getter throws when `_iframe` is null. Since `_iframe` and `cleanup()` are both on `BaseComponent`, no visibility change is needed — update `cleanup()` to check `this._iframe !== null` directly, bypassing the throwing getter:

```typescript
public cleanup(): void {
    if (this._iframe !== null) {
        this._iframe.unmount();
        this._iframe = null;
    }
}
```

This makes `cleanup()` safe to call before `initialize()` has run. It also makes `super.cleanup()` in `PaymentAuth.cleanup()` safe when no iframe was set (redirect-type flow): `super.cleanup()` will skip the `unmount()` call and null-assignment, while `PaymentAuth.cleanup()` still runs its own `restoreBodyOverflow` logic under its existing `if (this.loaded)` guard.

### 2. `MontonioCheckout.destroy()`

New public method. Steps execute in this order:

1. `this.loaded = false` and `this.isValid = false` — mark the instance as unloaded immediately, before any teardown, so any reads of these flags reflect teardown in progress
2. `cleanupPaymentAuth()` — cleans up PaymentAuth if present (see Section 3)
3. `this.messagingService.clearAllSubscriptions()` — clears all active message subscriptions so listeners registered in `setUpListeners()` are removed
4. `this.cleanup()` — unmounts and nulls the main iframe (from `BaseComponent`)

Safe to call before `initialize()` has been called, and safe to call multiple times (idempotent).

### 3. `cleanupPaymentAuth()` — guard for redirect-type PaymentAuth

When `paymentAuthData.type === 'redirect'`, `PaymentAuth.initialize()` returns early after submitting a form redirect, never setting an iframe and never setting `loaded = true`. In this case `this.paymentAuth` is non-null but `this.paymentAuth.iframe` would throw.

The fix: wrap the `removeIframeFromSubscription` calls in a `this.paymentAuth.loaded` guard. When `loaded` is false, no iframe was ever added to the subscriptions, so there is nothing to remove.

```typescript
private cleanupPaymentAuth(): void {
    if (this.paymentAuth) {
        if (this.paymentAuth.loaded) {
            this.messagingService.removeIframeFromSubscription(
                MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED,
                this.paymentAuth.iframe,
            );
            this.messagingService.removeIframeFromSubscription(
                MessageTypeEnum.CHECKOUT_PAYMENT_FAILED,
                this.paymentAuth.iframe,
            );
        }
        this.paymentAuth.cleanup();
        this.paymentAuth = null;
    }
}
```

### 4. No changes to `initialize()` or `MessagingService`

The `MessagingService` instance created in `BaseComponent`'s constructor lives for the full lifetime of the `MontonioCheckout` instance. Its `window` message listener stays registered throughout. After `destroy()` clears all subscriptions, the listener processes messages but finds no matching subscriptions and exits immediately. On the next `initialize()`, `setUpListeners()` re-registers subscriptions as normal.

**Known edge case — destroy during initialize:** If `destroy()` is called while `initialize()` is still in progress (i.e. `waitForMessage` is pending waiting for the iframe to load), `clearAllSubscriptions()` removes the pending subscription from the map. When the internal timeout callback fires, it calls `removeIframeFromSubscription` on a subscription that no longer exists, which throws inside an unguarded `setTimeout` callback — this surfaces as an **uncaught exception visible in the browser console**. This edge case is considered acceptable: calling `destroy()` while `initialize()` is actively awaiting is an unusual pattern. Integrators should `await initialize()` (or catch its rejection) before calling `destroy()`.

**Known edge case — destroy during redirect-type PaymentAuth:** If `destroy()` is called while `PaymentAuth` is suspended in the 30-second redirect wait (inside `redirectViaPost`), `cleanupPaymentAuth()` will safely clean up (no iframe, `loaded` is false, so no subscriptions to remove). However, after 30 seconds, `redirectViaPost` throws `'Redirect timeout'`, which propagates through `setUpPaymentAuthListener`'s catch block and calls `onError`. This means **`onError` may fire after `destroy()` has completed**. Integrators should be aware that calling `destroy()` does not suppress in-flight error callbacks.

## Usage Patterns

**Reuse same instance (primary use case):**
```typescript
montonioCheckout.destroy();
await montonioCheckout.initialize('#montonio-checkout-container');
```

**Full teardown without reuse:**
```typescript
montonioCheckout.destroy();
// instance is now idle; discard or reinitialize as needed
```

## Out of Scope

- Auto-calling `destroy()` inside `initialize()` — left to the integrator to call explicitly
- Fixing the `waitForMessage` throw when `destroy()` is called mid-initialization — acceptable edge case for now
- `mountElement` reset — it is overwritten on the next `initialize()` call anyway
