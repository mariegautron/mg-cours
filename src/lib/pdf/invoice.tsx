import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { INTER_400, INTER_700 } from "@/lib/pdf/fonts";
import type { InvoiceSnapshot } from "@/lib/ynov/invoice";

// Polices embarquées : requis pour un PDF/A-3 (Factur-X).
Font.register({
  family: "Inter",
  fonts: [
    { src: INTER_400, fontWeight: 400 },
    { src: INTER_700, fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 10, fontFamily: "Inter", color: "#111" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  meta: { color: "#444", marginBottom: 18 },
  parties: { flexDirection: "row", gap: 24, marginBottom: 22 },
  party: { flex: 1 },
  h: { fontWeight: 700, marginBottom: 3 },
  table: { marginTop: 4 },
  th: {
    flexDirection: "row",
    fontWeight: 700,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingBottom: 4,
  },
  tr: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#ccc" },
  cDesc: { flex: 5, paddingRight: 8 },
  cNum: { flex: 1.2, textAlign: "right" },
  totals: { marginTop: 14, alignSelf: "flex-end", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: {
    fontWeight: 700,
    fontSize: 12,
    borderTopWidth: 1,
    borderTopColor: "#111",
    paddingTop: 4,
  },
  note: { marginTop: 18, color: "#333" },
  footer: {
    marginTop: 22,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    color: "#333",
  },
});

const eur = (n: number) =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const date = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" });

export function InvoiceDocument({ s }: { s: InvoiceSnapshot }) {
  return (
    <Document title={`Facture ${s.number}`} author={s.seller.name} subject={s.line.designation}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>FACTURE N° {s.number}</Text>
        <Text style={styles.meta}>
          Date d’émission : {date(s.issuedOn)} · Échéance : {date(s.dueOn)}
        </Text>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.h}>Prestataire</Text>
            <Text>{s.seller.name}</Text>
            <Text>{s.seller.address}</Text>
            <Text>SIRET : {s.seller.siret}</Text>
            {s.seller.vatNumber ? <Text>TVA : {s.seller.vatNumber}</Text> : null}
            {s.seller.email ? <Text>{s.seller.email}</Text> : null}
            {s.seller.phone ? <Text>{s.seller.phone}</Text> : null}
          </View>
          <View style={styles.party}>
            <Text style={styles.h}>Client</Text>
            <Text>{s.buyer.name}</Text>
            <Text>{s.buyer.address}</Text>
            <Text>SIRET : {s.buyer.siret}</Text>
            {s.buyer.paIdentifier ? <Text>Identifiant PA : {s.buyer.paIdentifier}</Text> : null}
            <Text>Référence client : {s.purchaseOrderRef}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.cDesc}>Désignation</Text>
            <Text style={styles.cNum}>Quantité</Text>
            <Text style={styles.cNum}>PU HT</Text>
            <Text style={styles.cNum}>Total HT</Text>
          </View>
          <View style={styles.tr}>
            <Text style={styles.cDesc}>{s.line.designation}</Text>
            <Text style={styles.cNum}>{s.line.hours} h</Text>
            <Text style={styles.cNum}>{eur(s.line.unitPriceExVat)}</Text>
            <Text style={styles.cNum}>{eur(s.amounts.amountExVat)}</Text>
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Total HT</Text>
            <Text>{eur(s.amounts.amountExVat)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>TVA ({s.amounts.vatRate} %)</Text>
            <Text>{eur(s.amounts.vatAmount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grand]}>
            <Text>Total TTC</Text>
            <Text>{eur(s.amounts.amountIncVat)}</Text>
          </View>
        </View>

        {s.exemptionMention ? <Text style={styles.note}>{s.exemptionMention}</Text> : null}

        <View style={styles.footer}>
          <Text>
            {s.paymentTerms} — échéance le {date(s.dueOn)}.
          </Text>
          <Text>Mode de paiement : virement bancaire.</Text>
          <Text>{s.seller.bankDetails}</Text>
        </View>
      </Page>
    </Document>
  );
}
