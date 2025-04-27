"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Esquema de validación con Zod
const formSchema = z.object({
  nombreCompleto: z.string().min(3, { message: "El nombre completo es obligatorio" }),
  tipoIdentificacion: z.string().min(1, { message: "Seleccione un tipo de identificación" }),
  numeroIdentificacion: z.string().min(1, { message: "El número de identificación es obligatorio" }),
  motivoVisita: z.string().min(1, { message: "Seleccione un motivo de visita" }),
  fechaHoraIngreso: z.string(),
})

type FormValues = z.infer<typeof formSchema>

export function RegistroVisitantes() {
  const [submitted, setSubmitted] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasFirma, setHasFirma] = useState(false)
  const [tipoId, setTipoId] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombreCompleto: "",
      tipoIdentificacion: "",
      numeroIdentificacion: "",
      motivoVisita: "",
      fechaHoraIngreso: new Date().toISOString(),
    },
  })

  // Inicializar el canvas para la firma
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Configurar el canvas para ser responsivo
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.strokeStyle = "#000"
      ctxRef.current = ctx
    }

    // Actualizar la fecha y hora actual
    setValue("fechaHoraIngreso", new Date().toISOString())

    // Función para manejar el redimensionamiento
    const handleResize = () => {
      if (canvas) {
        const tempCanvas = document.createElement("canvas")
        const tempCtx = tempCanvas.getContext("2d")
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        if (tempCtx && ctxRef.current) {
          tempCtx.drawImage(canvas, 0, 0)
          canvas.width = canvas.offsetWidth
          canvas.height = canvas.offsetHeight
          ctxRef.current.lineWidth = 2
          ctxRef.current.lineCap = "round"
          ctxRef.current.strokeStyle = "#000"
          ctxRef.current.drawImage(tempCanvas, 0, 0)
        }
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [setValue])

  // Funciones para manejar el dibujo de la firma
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const ctx = ctxRef.current
    if (!ctx) return

    let clientX, clientY
    if ("touches" in e) {
      e.preventDefault()
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const ctx = ctxRef.current
    if (!ctx) return

    let clientX, clientY
    if ("touches" in e) {
      e.preventDefault()
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
    setHasFirma(true)
  }

  const endDrawing = () => {
    setIsDrawing(false)
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.closePath()
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasFirma(false)
  }

  // Función para validar el número de identificación según el tipo
  const validarNumeroIdentificacion = (numero: string, tipo: string) => {
    if (!numero) return false

    switch (tipo) {
      case "cedula":
        // Validación para cédula nacional (9 dígitos)
        return /^\d{9}$/.test(numero)
      case "dimex":
        // Validación para DIMEX (11 o 12 dígitos)
        return /^\d{11,12}$/.test(numero)
      case "pasaporte":
        // Validación para pasaporte (alfanumérico, entre 6 y 12 caracteres)
        return /^[A-Z0-9]{6,12}$/.test(numero)
      default:
        // Para "otro", al menos 4 caracteres
        return numero.length >= 4
    }
  }

  const onSubmit = (data: FormValues) => {
    // Validar que haya una firma
    if (!hasFirma) {
      toast({
        title: "Error en el formulario",
        description: "La firma es obligatoria para completar el registro",
        variant: "destructive",
      })
      return
    }

    // Validar el número de identificación según el tipo
    if (!validarNumeroIdentificacion(data.numeroIdentificacion, data.tipoIdentificacion)) {
      toast({
        title: "Error en el formulario",
        description: "El número de identificación no es válido para el tipo seleccionado",
        variant: "destructive",
      })
      return 
    }

    // Obtener la firma como imagen base64
    const canvas = canvasRef.current
    let firmaBase64 = ""
    if (canvas) {
      firmaBase64 = canvas.toDataURL("image/png")
      const obtenerPesoImagen = (base64String) => {
        let base64SinHeader = base64String.split(',')[1] || base64String;
        let sizeInBytes = (base64SinHeader.length * 3) / 4;
        return sizeInBytes; 
      };
      const pesoBytes = obtenerPesoImagen(firmaBase64);
      const pesoKB = (pesoBytes / 1024).toFixed(2); 

      console.log(`Peso de la imagen: ${pesoBytes} bytes (${pesoKB} KB)`); 

    }


    // Aquí se procesaría el envío de datos (en el futuro a Firebase)
    console.log({ ...data, firma: firmaBase64 })

    // Mostrar mensaje de éxito
    toast({
      title: "Registro exitoso",
      description: "El visitante ha sido registrado correctamente",
    })

    // Resetear el formulario y la firma
    reset()
    clearCanvas()
    setSubmitted(true)

    // Actualizar la fecha y hora
    setValue("fechaHoraIngreso", new Date().toISOString())

    // Después de 3 segundos, ocultar el mensaje de éxito
    setTimeout(() => {
      setSubmitted(false)
    }, 3000)
  }

  // Formatear la fecha para mostrarla en el formulario
  const formatearFecha = (fechaISO: string) => {
    const fecha = new Date(fechaISO)
    return fecha.toLocaleString("es-CR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <>
      <Card className="w-full shadow-lg">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-xl text-blue-800">Formulario de Registro de Visitantes</CardTitle>
          <CardDescription>Complete todos los campos obligatorios para registrar su visita</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form id="registro-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* Nombre Completo */}
              <div className="space-y-2">
                <Label htmlFor="nombreCompleto" className="font-medium">
                  Nombre Completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombreCompleto"
                  placeholder="Ingrese su nombre completo"
                  {...register("nombreCompleto")}
                  className={errors.nombreCompleto ? "border-red-500" : ""}
                />
                {errors.nombreCompleto && <p className="text-sm text-red-500">{errors.nombreCompleto.message}</p>}
              </div>

              {/* Tipo de Identificación */}
              <div className="space-y-2">
                <Label htmlFor="tipoIdentificacion" className="font-medium">
                  Tipo de Identificación <span className="text-red-500">*</span>
                </Label>
                <Select
                  onValueChange={(value) => {
                    setValue("tipoIdentificacion", value)
                    setTipoId(value)
                  }}
                  defaultValue=""
                >
                  <SelectTrigger id="tipoIdentificacion" className={errors.tipoIdentificacion ? "border-red-500" : ""}>
                    <SelectValue placeholder="Seleccione tipo de identificación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cedula">Cédula Nacional</SelectItem>
                    <SelectItem value="dimex">DIMEX</SelectItem>
                    <SelectItem value="pasaporte">Pasaporte</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tipoIdentificacion && (
                  <p className="text-sm text-red-500">{errors.tipoIdentificacion.message}</p>
                )}
              </div>

              {/* Número de Identificación */}
              <div className="space-y-2">
                <Label htmlFor="numeroIdentificacion" className="font-medium">
                  Número de Identificación <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="numeroIdentificacion"
                  placeholder={
                    tipoId === "cedula"
                      ? "Ingrese 9 dígitos"
                      : tipoId === "dimex"
                        ? "Ingrese 11-12 dígitos"
                        : tipoId === "pasaporte"
                          ? "Alfanumérico (6-12 caracteres)"
                          : "Ingrese su número de identificación"
                  }
                  {...register("numeroIdentificacion")}
                  className={errors.numeroIdentificacion ? "border-red-500" : ""}
                />
                {errors.numeroIdentificacion && (
                  <p className="text-sm text-red-500">{errors.numeroIdentificacion.message}</p>
                )}
                {tipoId && (
                  <p className="text-xs text-gray-500">
                    {tipoId === "cedula"
                      ? "Formato: 9 dígitos numéricos"
                      : tipoId === "dimex"
                        ? "Formato: 11 o 12 dígitos numéricos"
                        : tipoId === "pasaporte"
                          ? "Formato: Entre 6 y 12 caracteres alfanuméricos"
                          : "Mínimo 4 caracteres"}
                  </p>
                )}
              </div>

              {/* Motivo de la Visita */}
              <div className="space-y-2">
                <Label htmlFor="motivoVisita" className="font-medium">
                  Motivo de la Visita <span className="text-red-500">*</span>
                </Label>
                <Select onValueChange={(value) => setValue("motivoVisita", value)} defaultValue="">
                  <SelectTrigger id="motivoVisita" className={errors.motivoVisita ? "border-red-500" : ""}>
                    <SelectValue placeholder="Seleccione motivo de visita" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padre_madre">Padre/Madre</SelectItem>
                    <SelectItem value="encargado_legal">Encargado Legal</SelectItem>
                    <SelectItem value="proveedor">Proveedor</SelectItem>
                    <SelectItem value="inspector_mep">Inspector MEP</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                {errors.motivoVisita && <p className="text-sm text-red-500">{errors.motivoVisita.message}</p>}
              </div>

              {/* Fecha y Hora de Ingreso */}
              <div className="space-y-2">
                <Label htmlFor="fechaHoraIngreso" className="font-medium">
                  Fecha y Hora de Ingreso
                </Label>
                <Input
                  id="fechaHoraIngreso"
                  value={formatearFecha(new Date().toISOString())}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              {/* Firma Digital */}
              <div className="space-y-2">
                <Label className="font-medium">
                  Firma Digital <span className="text-red-500">*</span>
                </Label>
                <div className="border border-gray-300 rounded-md p-2 bg-white">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-40 border border-gray-200 rounded touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                  />
                  <div className="flex justify-end mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={clearCanvas} className="text-sm">
                      Borrar Firma
                    </Button>
                  </div>
                </div>
                {!hasFirma && (
                  <p className="text-sm text-gray-500">
                    Por favor, firme en el recuadro utilizando el mouse o su dedo en dispositivos táctiles
                  </p>
                )}
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset()
              clearCanvas()
              setValue("fechaHoraIngreso", new Date().toISOString())
            }}
          >
            Limpiar Formulario
          </Button>
          <Button type="submit" form="registro-form">
            Registrar Visita
          </Button>
        </CardFooter>
      </Card>

      {/* Mensaje de confirmación */}
      {submitted && (
        <Alert className="mt-4 bg-green-50 border-green-200">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ¡Registro completado con éxito! Gracias por registrar su visita.
          </AlertDescription>
        </Alert>
      )}

      <Toaster />
    </>
  )
}
