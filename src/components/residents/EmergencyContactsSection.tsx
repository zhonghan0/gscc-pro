import type { EmergencyContact } from '@/lib/types'
import { Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function EmergencyContactsSection({ contacts }: { contacts: EmergencyContact[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h3 className="font-semibold text-gray-900">Emergency Contacts</h3>
      {contacts.length === 0 ? (
        <p className="text-sm text-gray-400">No emergency contacts recorded.</p>
      ) : (
        <div className="space-y-3">
          {contacts.map(contact => (
            <div key={contact.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                  {contact.is_primary && <Badge variant="default">Primary</Badge>}
                </div>
                <p className="text-xs text-gray-500">{contact.relationship}</p>
                <p className="text-sm text-gray-700 mt-0.5">{contact.phone}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
