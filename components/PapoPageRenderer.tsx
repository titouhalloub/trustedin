import React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import * as LucideIcons from "lucide-react"; // import all icons

// Helper: resolve string -> Lucide icon
const getIcon = (name: string, className: string = "w-8 h-8 text-blue-600") => {
  const Icon = (LucideIcons as any)[name];
  return Icon ? <Icon className={className} /> : <span className="text-2xl">✨</span>;
};

// ------------------- HERO -------------------
interface HeroData {
  headline: string;
  subheadline: string;
  imageUrl?: string;
  cta: string;
}

/*
  IMPORTANT:
  - parent of <Image fill /> must be position:relative and have explicit height.
  - we use responsive heights so hero looks good on mobile and desktop.
*/
const HeroComponent = ({ data }: { data: HeroData }) => {
  const imageUrl = data.imageUrl || 'https://images.unsplash.com/photo-1520229074784-3f21ca65c38f';

  return (
    <header className="relative rounded-2xl overflow-hidden shadow-2xl my-12">
      {/* Container with explicit height for next/image fill */}
      <div className="relative w-full h-96 md:h-[560px]">
        {/* Background image using next/image fill */}
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={data.headline || "hero"}
            fill
            className="object-cover brightness-75"
            priority
            unoptimized
          />
        )}

        {/* Gradient overlay + content (z-10) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 to-black/40 flex items-center justify-center px-6">
          <div className="max-w-4xl text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-lg">
              {data.headline}
            </h1>
            <p className="text-lg md:text-xl text-gray-200 mt-4">{data.subheadline}</p>
            <div className="mt-6">
              <button className="bg-blue-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:bg-blue-700 transition">
                {data.cta}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// ------------------- FEATURES -------------------
interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface FeaturesData {
  title: string;
  items: FeatureItem[];
}

const FeaturesComponent = ({ data }: { data: FeaturesData }) => (
  <section className="my-12">
    <h2 className="text-4xl font-bold text-center mb-10">{data.title}</h2>
    <div className="grid md:grid-cols-3 gap-8">
      {data.items.map((item, index) => (
        <div
          key={index}
          className="bg-white/50 backdrop-blur-lg rounded-2xl p-8 shadow-xl hover:shadow-2xl transition"
        >
          <div className="flex justify-center mb-4">
            {getIcon(item.icon, "w-12 h-12 text-blue-600")}
          </div>
          <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
          <p className="text-gray-600 mt-3">{item.description}</p>
        </div>
      ))}
    </div>
  </section>
);

// ------------------- CTA -------------------
interface CtaData {
  title: string;
  buttonUrl: string;
  buttonText: string;
}

const CtaComponent = ({ data }: { data: CtaData }) => (
  <section className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-12 my-12 text-center shadow-2xl">
    <h2 className="text-4xl font-bold">{data.title}</h2>
    <a
      href={data.buttonUrl}
      className="mt-6 inline-block bg-white text-blue-600 font-bold py-3 px-6 rounded-full shadow-lg hover:bg-gray-200 transition"
    >
      {data.buttonText}
    </a>
  </section>
);

// ------------------- FOOTER -------------------
interface FooterData {
  text: string;
}

const FooterComponent = ({ data }: { data: FooterData }) => (
  <footer className="text-center text-gray-500 text-sm my-12">
    <p>{data.text}</p>
  </footer>
);

// ------------------- FALLBACK -------------------
interface FallbackData {
  text: string;
}

const FallbackComponent = ({ data }: { data: FallbackData }) => (
  <div className="my-12 bg-red-50 text-red-600 rounded-xl p-6 shadow-md text-center">
    <p>{data.text}</p>
  </div>
);

// ------------------- CAROUSEL -------------------
interface CarouselData {
  items: { text: string; author: string }[];
}

const CarouselComponent = ({ data }: { data: CarouselData }) => (
  <section className="my-12">
    <Carousel className="w-full max-w-md mx-auto">
      <CarouselContent>
        {data.items.map((item, index) => (
          <CarouselItem key={index}>
            <div className="p-1">
              <Card className="bg-white/50 backdrop-blur-lg shadow-xl rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <p className="text-center italic text-gray-800">"{item.text}"</p>
                  <p className="text-sm text-gray-500 mt-2">- {item.author}</p>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  </section>
);

// ------------------- STATS -------------------
interface StatsData {
  items: { value: string; label: string }[];
}

const StatsComponent = ({ data }: { data: StatsData }) => (
  <section className="my-12">
    <div className="grid md:grid-cols-3 gap-8">
      {data.items.map((item, index) => (
        <div
          key={index}
          className="bg-white/50 backdrop-blur-lg rounded-2xl p-8 shadow-xl text-center"
        >
          <h3 className="text-4xl font-extrabold text-blue-600">{item.value}</h3>
          <p className="text-gray-700">{item.label}</p>
        </div>
      ))}
    </div>
  </section>
);

// ------------------- TESTIMONIALS -------------------
interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
}

interface TestimonialsData {
  title: string;
  items: TestimonialItem[];
}

const TestimonialsComponent = ({ data }: { data: TestimonialsData }) => (
  <section className="my-12">
    <h2 className="text-4xl font-bold text-center mb-10">{data.title}</h2>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {data.items.map((item, index) => (
        <div
          key={index}
          className="bg-white/50 backdrop-blur-lg rounded-2xl p-8 shadow-xl"
        >
          <p className="text-gray-700 italic">"{item.quote}"</p>
          <p className="text-right text-gray-900 font-bold mt-4">- {item.author}</p>
          <p className="text-right text-gray-500 text-sm">{item.role}</p>
        </div>
      ))}
    </div>
  </section>
);

// ------------------- COMPONENT MAP -------------------
const componentMap: { [key: string]: React.FC<{ data: any }> } = {
  hero: HeroComponent,
  features: FeaturesComponent,
  carousel: CarouselComponent,
  stats: StatsComponent,
  testimonials: TestimonialsComponent,
  cta: CtaComponent,
  footer: FooterComponent,
  fallback: FallbackComponent,
};

// ------------------- PAGE RENDERER -------------------
interface Block {
  type: string;
  data: any;
}

interface PapoPageRendererProps {
  content: {
    layout: Block[];
  } | string;
}

const PapoPageRenderer = ({ content }: PapoPageRendererProps) => {
  if (!content || (typeof content !== "string" && !content.layout)) {
    if (typeof content === "string") {
      return <p>{content}</p>;
    }
    return (
      <div className="text-red-500">
        Invalid content structure: layout property is missing.
      </div>
    );
  }

  if (typeof content === "string") {
    return <p>{content}</p>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {content.layout.map((block: Block, index: number) => {
        const Component = componentMap[block.type];
        return Component ? (
          <Component key={index} data={block.data} />
        ) : (
          <div key={index} className="text-red-500">
            Unknown block type: {block.type}
          </div>
        );
      })}
    </div>
  );
};

export default PapoPageRenderer;
