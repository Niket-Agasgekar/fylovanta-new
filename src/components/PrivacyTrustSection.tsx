import React from 'react';
import { ShieldCheck, Lock, Cpu, EyeOff } from 'lucide-react';
import { getTranslations } from '../utils/i18n';

interface PrivacyTrustSectionProps {
  selectedLanguage?: string;
}

export const PrivacyTrustSection: React.FC<PrivacyTrustSectionProps> = ({
  selectedLanguage = 'en',
}) => {
  const t = getTranslations(selectedLanguage);

  const points = [
    {
      icon: <Cpu className="w-5 h-5 text-[#38BDF8]" />,
      title: 'Local In-Browser Processing',
      desc: 'Image conversion and resizing, PDF merge, split, rotate, numbering, watermarking, PDF compression, DOCX, CSV, JSON, and Markdown run in your browser.',
    },
    {
      icon: <EyeOff className="w-5 h-5 text-[#0D9488]" />,
      title: 'Privacy-Conscious Handling',
      desc: 'Core tools run right on your device so files are not stored in cloud drives or user file databases.',
    },
    {
      icon: <Lock className="w-5 h-5 text-[#16A34A]" />,
      title: 'Free to Use · No Subscription',
      desc: 'Easy online access with no forced registration, no paid subscription walls, and clear consent controls.',
    },
  ];

  return (
    <section className="py-14 sm:py-18 bg-[#0F172A] text-white border-t border-[#0B1120]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#38BDF8] mb-3">
            <ShieldCheck className="w-4 h-4" />
            <span>Free Online Access · Browser-First Design</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
            {t.privacyTitle}
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8] mt-3 leading-relaxed">
            Active PDF, image, and document tools run locally in your browser sandbox with zero accounts or subscription fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {points.map((pt, i) => (
            <div
              key={i}
              className="bg-[#0B1120] border border-[#334155] rounded-2xl p-6 space-y-3 hover:border-[#2563EB] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-[#334155] flex items-center justify-center">
                {pt.icon}
              </div>
              <h3 className="text-base font-bold text-white">{pt.title}</h3>
              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">{pt.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

