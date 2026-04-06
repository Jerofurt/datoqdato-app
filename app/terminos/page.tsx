'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function TerminosPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-brand-600 text-white px-4 pt-4 pb-8">
        <button onClick={() => router.back()} className="p-1 mb-4">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Términos y Condiciones</h1>
        <p className="text-brand-200 text-sm mt-1">Última actualización: Abril 2026</p>
      </div>

      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6 text-sm text-slate-600 leading-relaxed mb-8">

          <section>
            <h2 className="font-bold text-slate-800 text-base mb-2">1. Naturaleza del servicio</h2>
            <p>
              DatoQDato es una plataforma digital que funciona como directorio y agenda de oficios,
              conectando a personas que buscan servicios domésticos y profesionales con proveedores
              independientes que ofrecen dichos servicios. <strong>DatoQDato NO es parte de la relación
              contractual entre el cliente y el profesional.</strong>
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 text-base mb-2">2. Limitación de responsabilidad</h2>
            <p>
              DatoQDato no garantiza, avala ni certifica la calidad, idoneidad, puntualidad o resultado
              de los servicios prestados por los profesionales registrados en la plataforma. La contratación
              de cualquier servicio es decisión exclusiva del cliente, quien asume la responsabilidad de
              verificar las credenciales, habilitaciones y seguros del profesional antes de contratar.
            </p>
            <p className="mt-2">
              DatoQDato no será responsable por daños directos, indirectos, incidentales o consecuentes
              que surjan de la relación entre clientes y profesionales, incluyendo pero no limitado a:
              daños materiales, lesiones personales, incumplimiento de plazos, defectos en el trabajo
              realizado, o cualquier disputa comercial.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 text-base mb-2">3. Sistema de reseñas</h2>
            <p>
              Las reseñas y calificaciones publicadas en DatoQDato representan la opinión individual de
              cada cliente y no constituyen una recomendación por parte de la plataforma. DatoQDato se
              reserva el derecho de moderar o eliminar reseñas que considere fraudulentas, abusivas o
              que no reflejen una experiencia real de servicio.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 text-base mb-2">4. Obligaciones del profesional</h2>
            <p>
              El profesional registrado declara y garantiza que: cuenta con las habilitaciones y
              matrículas necesarias para ejercer su oficio según la legislación vigente; la información
              provista en su perfil es veraz y actualizada; asume plena responsabilidad por los servicios
              que presta y sus consecuencias.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 text-base mb-2">5. Obligaciones del cliente</h2>
            <p>
              El cliente se compromete a: utilizar la plataforma de buena fe; no dejar reseñas falsas
              o malintencionadas; verificar por su cuenta las credenciales del profesional antes de
              contratar; acordar directamente con el profesional el alcance, precio y condiciones del
              servicio.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 text-base mb-2">6. Suscripción de profesionales</h2>
            <p>
              Los profesionales acceden a un período de prueba gratuito de 30 días. Finalizado el
              período de prueba, se requiere el pago de una suscripción mensual para mantener el perfil
              activo y visible en la plataforma. DatoQDato se reserva el derecho de modificar el valor
              de la suscripción con previo aviso de 30 días.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 text-base mb-2">7. Propiedad intelectual</h2>
            <p>
              Todo el contenido de la plataforma (diseño, código, marca, logotipos) es propiedad de
              DatoQDato. Los profesionales autorizan el uso de su nombre, foto y datos de contacto
              publicados en la plataforma con fines de promoción del servicio.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 text-base mb-2">8. Privacidad y datos personales</h2>
            <p>
              DatoQDato recopila y almacena datos personales necesarios para el funcionamiento de la
              plataforma, en cumplimiento con la Ley 25.326 de Protección de Datos Personales de la
              República Argentina. Los datos no serán compartidos con terceros salvo cuando sea
              necesario para la prestación del servicio o por requerimiento legal.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 text-base mb-2">9. Resolución de conflictos</h2>
            <p>
              Cualquier controversia que surja entre clientes y profesionales deberá resolverse
              directamente entre las partes involucradas. DatoQDato podrá, a su exclusivo criterio,
              mediar o facilitar la comunicación, pero no asume obligación de hacerlo. En caso de
              disputas relacionadas con el uso de la plataforma, serán competentes los tribunales
              ordinarios de la Ciudad Autónoma de Buenos Aires.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 text-base mb-2">10. Modificaciones</h2>
            <p>
              DatoQDato se reserva el derecho de modificar estos términos en cualquier momento. Las
              modificaciones entrarán en vigencia al momento de su publicación en la plataforma. El
              uso continuado del servicio implica la aceptación de los términos modificados.
            </p>
          </section>

          <section className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">
              Al registrarte y usar DatoQDato, aceptás estos términos y condiciones en su totalidad.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
