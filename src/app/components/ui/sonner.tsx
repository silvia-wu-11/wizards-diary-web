"use client";

import { Toaster as Sonner } from "sonner";

const Toaster = () => (
  <Sonner
    theme="dark"
    className="toaster group"
    toastOptions={{
      classNames: {
        toast: "bg-castle-stone border-rusty-copper text-parchment-white",
      },
    }}
  />
);

export { Toaster };
