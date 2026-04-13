export default function SectionHeader({ title, description }) {
  return (
    <div>
      <h2 className="font-space-grotesk text-base font-medium tracking-tight text-white">
        {title}
      </h2>
      {description && (
        <p className="font-space-grotesk text-sm text-[#A8A29E] mt-0.5">
          {description}
        </p>
      )}
    </div>
  );
}
