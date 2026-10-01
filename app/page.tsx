"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Carregando } from "@/components/ui";

export default function Home() {
  const { usuario, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;
    if (!usuario) router.replace("/login");
    else router.replace("/financas");
  }, [carregando, usuario, router]);

  return <Carregando />;
}
