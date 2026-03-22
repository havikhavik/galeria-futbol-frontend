import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { isAdminAuthenticated } from "../../shared/auth/adminSession";
import { httpClient } from "../../shared/api/httpClient";
import { navigateWithCurrentUrl } from "../../shared/utils/navigation";

import { routes, toAppPath } from "./routes";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const redirectToLogin = () => {
    navigateWithCurrentUrl(
      (target) => {
        target.pathname = toAppPath(routes.adminLogin);
        target.search = "";
        target.searchParams.set("next", routes.admin);
      },
      { replace: true },
    );
  };

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      redirectToLogin();
    }
  }, []);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      setIsChecking(false);
      return;
    }

    setIsVerified(true);
    setIsChecking(false);

    let cancelled = false;

    const verify = async () => {
      try {
        await httpClient.getJson<{ authenticated: boolean }>("auth/me");
      } catch (error) {
        if (cancelled) return;

        const message = error instanceof Error ? error.message : "";
        const unauthorized =
          message.endsWith(": 401") || message.endsWith(": 403");

        if (unauthorized || !isAdminAuthenticated()) {
          setIsVerified(false);
          redirectToLogin();
          return;
        }
      }
    };

    void verify();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isChecking || !isVerified) return null;
  return <>{children}</>;
}
