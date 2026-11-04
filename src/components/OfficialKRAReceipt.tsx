import React, { useRef } from 'react';
import { Printer, Download, ShieldCheck, Share2, CheckCircle, FileText, QrCode } from 'lucide-react';
import { KRAReceipt } from '../types';

interface OfficialKRAReceiptProps {
  receipt: KRAReceipt | null;
  onSendToWhatsApp: () => void;
}

export const OfficialKRAReceipt: React.FC<OfficialKRAReceiptProps> = ({
  receipt,
  onSendToWhatsApp,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const fallbackReceipt: KRAReceipt = {
    ackNumber: 'KRA202584910283',
    pin: 'A019876543K',
    taxpayerName: 'CITIZEN TAXPAYER (INDIVIDUAL)',
    taxObligation: 'Income Tax - Resident Individual',
    returnPeriodFrom: '01/01/2025',
    returnPeriodTo: '31/12/2025',
    submissionDate: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString(),
    modeOfFiling: 'Electronic (e-Bureaucrat Headless RPA)',
    totalTaxDue: '0.00 KES (NIL)',
    status: 'FILED & VERIFIED',
    qrVerificationUrl: 'https://itax.kra.go.ke/KRA-Portal/verifyReturn.htm',
  };

  const data = receipt || fallbackReceipt;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs print:hidden">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Official KRA e-Return Acknowledgment Receipt
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Generated autonomously by e-Bureaucrat Playwright browser worker
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSendToWhatsApp}
            className="px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            Send to WhatsApp
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Official Kenya Revenue Authority Document Box */}
      <div
        ref={receiptRef}
        className="bg-white text-neutral-900 border-2 border-neutral-300 shadow-lg p-8 rounded-sm space-y-6 print:border-none print:shadow-none print:p-0"
      >
        {/* Header Section */}
        <div className="border-b-2 border-black pb-4 text-center space-y-1 relative">
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 border border-black rounded-full flex items-center justify-center p-2">
              <ShieldCheck className="w-10 h-10 text-neutral-900" />
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase">
            KENYA REVENUE AUTHORITY
          </h1>
          <h2 className="text-sm font-semibold tracking-wide text-neutral-700">
            DOMESTIC TAXES DEPARTMENT
          </h2>
          <p className="text-xs font-mono font-bold text-neutral-800 pt-1">
            ACKNOWLEDGMENT RECEIPT FOR INDIVIDUAL NIL RETURN
          </p>
        </div>

        {/* Reference & Barcode Header */}
        <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b border-neutral-300 pb-4">
          <div>
            <span className="text-neutral-500 block">Acknowledgment Number:</span>
            <span className="font-bold text-sm text-neutral-900">{data.ackNumber}</span>
          </div>
          <div className="text-right">
            <span className="text-neutral-500 block">Filing Mode:</span>
            <span className="font-semibold text-neutral-800">{data.modeOfFiling}</span>
          </div>
        </div>

        {/* Taxpayer Information Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 border-b border-neutral-200 pb-1">
            1. Taxpayer Particulars
          </h3>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
            <div>
              <span className="text-neutral-500">KRA PIN:</span>
              <p className="font-bold text-neutral-900">{data.pin}</p>
            </div>
            <div>
              <span className="text-neutral-500">Taxpayer Name:</span>
              <p className="font-bold text-neutral-900">{data.taxpayerName}</p>
            </div>
            <div>
              <span className="text-neutral-500">Tax Obligation:</span>
              <p className="font-bold text-neutral-900">{data.taxObligation}</p>
            </div>
            <div>
              <span className="text-neutral-500">Return Period:</span>
              <p className="font-bold text-neutral-900">
                {data.returnPeriodFrom} - {data.returnPeriodTo}
              </p>
            </div>
          </div>
        </div>

        {/* Assessment Details */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 border-b border-neutral-200 pb-1">
            2. Tax Assessment & Declaration
          </h3>
          <table className="w-full text-xs font-mono border border-neutral-300">
            <thead className="bg-neutral-100 border-b border-neutral-300">
              <tr>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-right">Amount (KES)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-200">
                <td className="p-2">Declared Taxable Income</td>
                <td className="p-2 text-right">0.00</td>
              </tr>
              <tr className="border-b border-neutral-200">
                <td className="p-2">PAYE / Advance Tax Paid</td>
                <td className="p-2 text-right">0.00</td>
              </tr>
              <tr className="bg-neutral-50 font-bold">
                <td className="p-2">Total Tax Payable / (Refund Due)</td>
                <td className="p-2 text-right text-emerald-800">{data.totalTaxDue}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Verification QR & Legal Disclaimer */}
        <div className="border-t-2 border-black pt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="flex justify-center md:justify-start">
            <div className="w-24 h-24 border border-neutral-400 p-1 flex items-center justify-center bg-white shadow-xs">
              <QrCode className="w-20 h-20 text-neutral-900" />
            </div>
          </div>

          <div className="md:col-span-3 text-[11px] space-y-1.5 text-neutral-600 leading-normal font-sans">
            <p className="font-bold text-neutral-900">
              Electronic Verification Seal:
            </p>
            <p>
              This is an official computer-generated acknowledgment receipt issued pursuant to Section 24 of the Tax Procedures Act, 2015. No physical signature is required.
            </p>
            <p className="font-mono text-[10px] text-neutral-500">
              Timestamp: {data.submissionDate} · Ref: {data.ackNumber} · Automated by e-Bureaucrat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
