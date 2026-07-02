import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/configure")({
  component: Configure,
});

function Configure() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/app" : "/auth", replace: true });
    });
  }, [navigate]);
  return <div className="min-h-screen bg-background" />;
}
