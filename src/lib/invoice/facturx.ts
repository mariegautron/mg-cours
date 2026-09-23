import { renderToBuffer } from "@react-pdf/renderer";
import { check, generate } from "@stafyniaksacha/facturx";
import { PDFDocument } from "pdf-lib";

import { InvoiceDocument } from "@/lib/pdf/invoice";
import type { InvoiceSnapshot } from "@/lib/ynov/invoice";

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const d102 = (iso: string) => iso.replaceAll("-", "");
const amt = (n: number) => n.toFixed(2);

/** SIREN = 9 premiers chiffres du SIRET (identifiant fiscal FC de la franchise en base). */
const siren = (siret: string) => siret.slice(0, 9);

/**
 * XML Factur-X, profil EN 16931 (CII D22B). Validé XSD + Schematron dans les tests.
 * Franchise 293 B → catégorie « E » (exonéré) avec motif ; sinon catégorie « S » à 20 %.
 */
export function snapshotToXml(s: InvoiceSnapshot): string {
  const exempt = s.seller.vatExempt;
  const cat = exempt ? "E" : "S";
  const rate = amt(s.amounts.vatRate);
  const tax = `<ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${cat}</ram:CategoryCode><ram:RateApplicablePercent>${rate}</ram:RateApplicablePercent>`;
  const delivery = s.line.deliveredOn ?? s.issuedOn;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>
<rsm:ExchangedDocument><ram:ID>${esc(s.number)}</ram:ID><ram:TypeCode>380</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">${d102(s.issuedOn)}</udt:DateTimeString></ram:IssueDateTime>${s.exemptionMention ? `<ram:IncludedNote><ram:Content>${esc(s.exemptionMention)}</ram:Content></ram:IncludedNote>` : ""}</rsm:ExchangedDocument>
<rsm:SupplyChainTradeTransaction>
<ram:IncludedSupplyChainTradeLineItem>
<ram:AssociatedDocumentLineDocument><ram:LineID>1</ram:LineID></ram:AssociatedDocumentLineDocument>
<ram:SpecifiedTradeProduct><ram:Name>${esc(s.line.designation)}</ram:Name></ram:SpecifiedTradeProduct>
<ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${amt(s.line.unitPriceExVat)}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
<ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="HUR">${s.line.hours}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
<ram:SpecifiedLineTradeSettlement><ram:ApplicableTradeTax>${tax}</ram:ApplicableTradeTax><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${amt(s.amounts.amountExVat)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement>
</ram:IncludedSupplyChainTradeLineItem>
<ram:ApplicableHeaderTradeAgreement>
<ram:SellerTradeParty><ram:Name>${esc(s.seller.name)}</ram:Name><ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${esc(s.seller.siret)}</ram:ID></ram:SpecifiedLegalOrganization><ram:PostalTradeAddress><ram:LineOne>${esc(s.seller.address)}</ram:LineOne><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>${s.seller.email ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${esc(s.seller.email)}</ram:URIID></ram:URIUniversalCommunication>` : ""}<ram:SpecifiedTaxRegistration><ram:ID schemeID="${exempt ? "FC" : "VA"}">${esc(exempt ? siren(s.seller.siret) : (s.seller.vatNumber ?? ""))}</ram:ID></ram:SpecifiedTaxRegistration></ram:SellerTradeParty>
<ram:BuyerTradeParty><ram:Name>${esc(s.buyer.name)}</ram:Name><ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${esc(s.buyer.siret)}</ram:ID></ram:SpecifiedLegalOrganization><ram:PostalTradeAddress><ram:LineOne>${esc(s.buyer.address)}</ram:LineOne><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress></ram:BuyerTradeParty>
<ram:BuyerOrderReferencedDocument><ram:IssuerAssignedID>${esc(s.purchaseOrderRef)}</ram:IssuerAssignedID></ram:BuyerOrderReferencedDocument>
</ram:ApplicableHeaderTradeAgreement>
<ram:ApplicableHeaderTradeDelivery><ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">${d102(delivery)}</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent></ram:ApplicableHeaderTradeDelivery>
<ram:ApplicableHeaderTradeSettlement>
<ram:PaymentReference>${esc(s.number)}</ram:PaymentReference>
<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
<ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>30</ram:TypeCode><ram:PayeePartyCreditorFinancialAccount><ram:IBANID>${esc(s.seller.iban)}</ram:IBANID></ram:PayeePartyCreditorFinancialAccount></ram:SpecifiedTradeSettlementPaymentMeans>
<ram:ApplicableTradeTax><ram:CalculatedAmount>${amt(s.amounts.vatAmount)}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode>${exempt ? `<ram:ExemptionReason>${esc(s.exemptionMention ?? "")}</ram:ExemptionReason>` : ""}<ram:BasisAmount>${amt(s.amounts.amountExVat)}</ram:BasisAmount><ram:CategoryCode>${cat}</ram:CategoryCode><ram:RateApplicablePercent>${rate}</ram:RateApplicablePercent></ram:ApplicableTradeTax>
<ram:SpecifiedTradePaymentTerms><ram:Description>${esc(s.paymentTerms)}</ram:Description><ram:DueDateDateTime><udt:DateTimeString format="102">${d102(s.dueOn)}</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>
<ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>${amt(s.amounts.amountExVat)}</ram:LineTotalAmount><ram:TaxBasisTotalAmount>${amt(s.amounts.amountExVat)}</ram:TaxBasisTotalAmount><ram:TaxTotalAmount currencyID="EUR">${amt(s.amounts.vatAmount)}</ram:TaxTotalAmount><ram:GrandTotalAmount>${amt(s.amounts.amountIncVat)}</ram:GrandTotalAmount><ram:DuePayableAmount>${amt(s.amounts.amountIncVat)}</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation>
</ram:ApplicableHeaderTradeSettlement>
</rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`;
}

/** Vérifie le XML (XSD + Schematron EN 16931). Lève une erreur détaillée si invalide. */
export async function assertValidXml(xml: string): Promise<void> {
  const r = await check({ xml, level: "en16931", schematron: true });
  if (r.valid && r.schematronValid !== false) return;
  const details = [
    ...r.errors.map((e) => String(e?.message ?? e)),
    ...(r.schematronErrors ?? []).filter((e) => e.flag !== "warning").map((e) => e.message),
  ];
  throw new Error(`Facture Factur-X invalide : ${details.join(" | ")}`);
}

/** PDF lisible de la facture (sans XML). */
export async function renderInvoicePdf(s: InvoiceSnapshot): Promise<Buffer> {
  return renderToBuffer(InvoiceDocument({ s }));
}

/** Facture Factur-X : PDF/A-3 avec le XML EN 16931 embarqué. */
export async function buildFacturX(s: InvoiceSnapshot): Promise<{ pdf: Uint8Array; xml: string }> {
  const xml = snapshotToXml(s);
  await assertValidXml(xml);
  const rendered = await renderInvoicePdf(s);
  // La lib attribue elle-même l'identifiant du document : on retire celui posé par react-pdf.
  const pdf = await PDFDocument.load(rendered);
  delete pdf.context.trailerInfo.ID;
  const facturx = await generate({
    pdf,
    xml,
    level: "en16931",
    language: "fr-FR",
    meta: {
      author: s.seller.name,
      title: `Facture ${s.number}`,
      subject: s.line.designation,
      keywords: ["facture", "factur-x"],
      date: new Date(`${s.issuedOn}T00:00:00Z`),
    },
  });
  return { pdf: facturx, xml };
}
