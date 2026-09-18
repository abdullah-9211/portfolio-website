"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import clsx from "clsx";
import type { Venture } from "@/data/ventures";
import { ChipList } from "@/components/primitives/ChipList";
import { useMagneticTilt } from "./useMagneticTilt";
import { ForgeBeaver } from "./ForgeBeaver";
import { ValkrixNeuralNet } from "./ValkrixNeuralNet";

export function VentureCard({ venture }: { venture: Venture }) {
  const { ref, enabled, rotateX, rotateY, handlePointerMove, handlePointerLeave } =
    useMagneticTilt();

  const cardClass = venture.id === "valkrix" ? "card-valkrix" : "card-forge";

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        enabled
          ? { rotateX, rotateY, transformPerspective: 800 }
          : undefined
      }
      className={clsx(
        "relative overflow-hidden rounded-card border p-8 sm:p-10",
        cardClass
      )}
    >
      <div
        className={clsx(
          "flex",
          venture.logoAlign === "center" ? "justify-center" : "justify-start"
        )}
      >
        <Image
          src={venture.logoSrc}
          alt={venture.logoAlt}
          width={venture.logoWidth}
          height={venture.logoHeight}
          className={clsx("w-auto object-contain", venture.logoClassName)}
        />
      </div>
      <p className="mt-6 font-display text-xl font-semibold text-paper sm:text-2xl">
        {venture.tagline}
      </p>
      <p className="mt-4 leading-relaxed text-dim">{venture.description}</p>
      <ChipList className="mt-6" items={venture.facts} />
      {/*
        href + venture badge share one flow row (not an absolute overlay)
        so the 3D piece can never cover the chips or any other text at any
        viewport — it occupies real, reflowable layout space instead of
        floating over content. flex-wrap is the belt-and-suspenders: even
        in an unexpectedly narrow container the badge drops to its own
        line below the link rather than overlapping it.
      */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <a
          href={venture.href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm text-signal hover:underline"
        >
          {venture.href.replace(/^https?:\/\//, "")}
        </a>
        {venture.id === "forge" && <ForgeBeaver />}
        {venture.id === "valkrix" && <ValkrixNeuralNet />}
      </div>
    </motion.div>
  );
}
