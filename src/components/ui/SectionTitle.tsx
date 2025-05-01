"use client";

interface SectionTitleProps {
  title: string;
  description?: string;
}

export function SectionTitle({ title, description }: SectionTitleProps) {
  return (
    <div className="select-none">
      <h3 className="text-2xl font-minecraft text-white mb-5 lowercase tracking-wider">
        {title}
      </h3>
      {description && (
        <p className="text-xl text-white/70 mb-6 font-minecraft tracking-wide">
          {description}
        </p>
      )}
    </div>
  );
}
