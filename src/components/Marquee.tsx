const Marquee = () => {
  const text = "STAY. EXPLORE. DISCOVER. EXPERIENCE.";
  return (
    <div className="sticky top-0 z-[100] h-8 bg-primary text-primary-foreground overflow-hidden flex items-center w-full">
      <div className="animate-marquee whitespace-nowrap flex w-max">
        {[...Array(20)].map((_, i) => (
          <span key={i} className="text-xs font-semibold tracking-wider mx-8">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
