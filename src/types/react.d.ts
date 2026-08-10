import "react";

declare module "react" {
    // The generic name must match React's declaration for interface merging.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        webkitdirectory?: string;
    }
}
