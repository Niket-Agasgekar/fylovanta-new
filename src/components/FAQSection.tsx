import React, { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { FAQS } from '../data/toolsData';
import { getTranslations } from '../utils/i18n';
import { BRAND } from '../config/brand';

interface FAQSectionProps {
  selectedLanguage?: string;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ selectedLanguage = 'en' }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const t = getTranslations(selectedLanguage);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const filteredFaqs = FAQS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="py-12 sm:py-18">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
            Support &amp; Technical FAQ
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            {t.faqTitle}
          </h2>
          <p className="text-sm sm:text-base text-[#475569]">
            Everything you need to know about {BRAND.name} browser and temporary media conversions.
          </p>
        </div>

        {/* Quick FAQ filter input */}
        <div className="relative mb-6 max-w-md mx-auto">
          <Search className="w-4 h-4 text-[#475569] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions (e.g. file size, privacy)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs sm:text-sm text-[#0F172A] placeholder:text-[#475569] focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#CBD5E1] overflow-hidden transition-colors hover:border-[#2563EB]"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  aria-expanded={isOpen}
                  className="w-full p-5 text-left flex items-center justify-between font-bold text-[#0F172A] text-sm sm:text-base hover:text-[#2563EB] transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#475569] transition-transform duration-200 shrink-0 ml-4 ${
                      isOpen ? 'rotate-180 text-[#2563EB]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-[#475569] leading-relaxed border-t border-[#CBD5E1] pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

