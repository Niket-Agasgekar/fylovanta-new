import React from 'react';
import { UploadCloud, Sliders, Download, Check } from 'lucide-react';
import { getTranslations } from '../utils/i18n';

interface HowItWorksProps {
  selectedLanguage?: string;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ selectedLanguage = 'en' }) => {
  const t = getTranslations(selectedLanguage);

  const steps = [
    {
      num: '01',
      title: 'Upload',
      desc: 'Drop your files into the conversion zone or click browse. Supports images, PDFs, Word documents, CSV spreadsheets, JSON, and Markdown.',
      icon: <UploadCloud className="w-6 h-6 text-[#2563EB]" />,
      footer: 'Drag & drop or batch select',
    },
    {
      num: '02',
      title: 'Configure',
      desc: 'Pick your desired output format from the menu and fine-tune optional settings like quality, dimensions, page range, or compression level.',
      icon: <Sliders className="w-6 h-6 text-[#0D9488]" />,
      footer: 'Precision format controls',
    },
    {
      num: '03',
      title: 'Download',
      desc: 'Click Convert to process locally in your browser right on your device. Save individual files or download a single combined ZIP.',
      icon: <Download className="w-6 h-6 text-[#16A34A]" />,
      footer: 'Instant download or ZIP archive',
    },
  ];

  return (
    <section className="py-12 sm:py-18">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
            Three-Step Workflow
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            {t.howItWorksTitle}
          </h2>
          <p className="text-sm sm:text-base text-[#475569]">
            Convert, compress, and edit files online for free—no account or desktop software required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="bg-white rounded-3xl border border-[#CBD5E1] p-7 flex flex-col justify-between hover:border-[#2563EB] transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#F7F9FC] border border-[#CBD5E1] flex items-center justify-center">
                    {step.icon}
                  </div>
                  <span className="text-2xl font-black text-[#CBD5E1] font-mono-tabular">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-2">{step.title}</h3>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">{step.desc}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#CBD5E1] flex items-center text-xs font-bold text-[#0F172A]">
                <Check className="w-3.5 h-3.5 text-[#16A34A] mr-1.5" />
                <span>{step.footer}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

