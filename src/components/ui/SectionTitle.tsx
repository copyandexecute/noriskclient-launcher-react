"use client";

interface SectionTitleProps {
  title: string;
  description?: string;
}

export function SectionTitle({ title, description }: SectionTitleProps) {
  return (
    <div>
      <h3 className="text-xl font-minecraft text-white mb-4 lowercase tracking-wider">
        {title}
      </h3>
      {description && (
        <p className="text-white/70 mb-6 font-minecraft text-sm tracking-wide">
          {description}
        </p>
      )}
    </div>
  );
}
