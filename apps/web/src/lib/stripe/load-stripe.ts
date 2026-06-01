export interface StripeCardElement {
  mount(domElement: HTMLElement): void;
  destroy(): void;
}

export interface StripeElements {
  create(type: 'card', options?: Record<string, unknown>): StripeCardElement;
}

export interface StripePaymentMethod {
  id: string;
}

export interface StripePaymentIntent {
  status: string;
}

export interface StripeInstance {
  elements(): StripeElements;
  createPaymentMethod(options: {
    type: 'card';
    card: StripeCardElement;
  }): Promise<{
    error?: { message?: string };
    paymentMethod?: StripePaymentMethod;
  }>;
  confirmCardPayment(clientSecret: string): Promise<{
    error?: { message?: string };
    paymentIntent?: StripePaymentIntent;
  }>;
}

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeInstance;
  }
}

let stripePromise: Promise<StripeInstance | null> | null = null;

export function loadStripeJs(): Promise<StripeInstance | null> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  if (stripePromise) {
    return stripePromise;
  }

  stripePromise = new Promise((resolve) => {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
      resolve(null);
      return;
    }

    if (window.Stripe) {
      resolve(window.Stripe(key));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => resolve(window.Stripe ? window.Stripe(key) : null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return stripePromise;
}
