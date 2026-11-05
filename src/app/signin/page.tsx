import { Suspense } from "react";
import type { Metadata } from "next";
import { SupplyScene } from "@/components/signin/SupplyScene";
import { SignInForm } from "@/components/signin/SignInForm";
import "./signin.css";

export const metadata: Metadata = {
  title: "Sign in · DockLog",
  description:
    "Sign in to DockLog clinical supply warehouse management for hospitals and clinics.",
};

export default function SignInPage() {
  return (
    <div className="signin-root">
      <div className="stage">
        <SupplyScene />
        <main className="panel">
          <h1 className="brand">
            <span>DockLog</span>
          </h1>
          <p className="headline">Clinical supply access</p>
          <p className="support">
            Sign in to manage hospital inventory, cold-chain receiving, and clinic
            replenishment.
          </p>

          <Suspense fallback={null}>
            <SignInForm />
          </Suspense>

          <p className="demo-hint">
            Demo: logistics.ops / clinic.ortho / clinic.pharmacy — password
            docklog123
          </p>
          <p className="foot">DockLog WMS · Hospital &amp; clinic logistics</p>
        </main>
      </div>
    </div>
  );
}
