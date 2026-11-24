import { HeartHandshakeIcon, MailIcon, MapPinIcon, PhoneIcon, ShieldIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { PatientDetail } from "../schemas";

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5">
      <span className="mt-0.5 text-muted-foreground [&_svg]:size-4" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm break-words">{children}</dd>
      </div>
    </div>
  );
}

export function ContactCard({ patient }: { patient: PatientDetail }) {
  return (
    <Card aria-labelledby="contact-heading">
      <CardHeader>
        <CardTitle id="contact-heading">Contact &amp; coverage</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          <Row icon={<PhoneIcon />} label="Phone">
            <a href={`tel:${patient.phone.replace(/[^\d+]/g, "")}`} className="num hover:underline">
              {patient.phone}
            </a>
          </Row>
          {patient.email && (
            <Row icon={<MailIcon />} label="Email">
              <a href={`mailto:${patient.email}`} className="hover:underline">
                {patient.email}
              </a>
            </Row>
          )}
          <Row icon={<MapPinIcon />} label="Address">
            {patient.address_line}, {patient.city} {patient.postal_code}
          </Row>
          <Row icon={<HeartHandshakeIcon />} label="Emergency contact">
            {patient.emergency_contact_name} <span className="text-muted-foreground">({patient.emergency_contact_relation})</span>
            <br />
            <span className="num">{patient.emergency_contact_phone}</span>
          </Row>
          <Row icon={<ShieldIcon />} label="Insurance">
            {patient.insurance_provider} · {patient.insurance_plan}
            <br />
            <span className="num text-muted-foreground">Member {patient.insurance_member_id}</span>
          </Row>
        </dl>
        <p className="pt-3 text-xs text-muted-foreground">Date of birth {formatDate(`${patient.date_of_birth}T00:00:00Z`)}</p>
      </CardContent>
    </Card>
  );
}
