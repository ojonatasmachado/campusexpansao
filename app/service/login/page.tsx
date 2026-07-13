import { Suspense } from "react";
import ServiceLoginForm from "./LoginForm";

export default function ServiceLoginPage() {
  return (
    <Suspense fallback={null}>
      <ServiceLoginForm />
    </Suspense>
  );
}
