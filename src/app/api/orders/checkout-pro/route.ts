import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const raffleId = searchParams.get("raffleId");

    // Determina se é preference da raffa (sem pedido) ou de um pedido específico
    const isRaffleId = !orderId || (orderId && orderId.startsWith("raf_"));

    // Preference da rifa inteira (painel) exige sessão de vendedor/admin.
    // Pedido específico é fluxo público do comprador (sem login).
    if (isRaffleId) {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    }

    // Se vier um orderId que não é "raf_", procura o pedido específico
    let order;
    if (orderId && !isRaffleId) {
      order = await db.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          raffleId: true,
          totalAmount: true,
          buyerName: true,
          buyerPhone: true,
          buyerEmail: true,
          quantity: true,
          status: true,
        },
      });

      if (!order) {
        return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
      }

      if (order.status !== "PENDING") {
        return NextResponse.json(
          { error: "Somente pedidos pendentes podem ser convertidos para Checkout Pro" },
          { status: 400 }
        );
      }
    }

    // Busca a raffa - usa raffleId se fornecido, senão usa orderId (caso seja raffleId)
    const targetRaffleId = raffleId || (isRaffleId ? orderId : order?.raffleId);
    
    if (!targetRaffleId || targetRaffleId === "raf_raffle_raffle") {
      return NextResponse.json({ error: "ID da raffa inválido" }, { status: 400 });
    }

    const raffle = await db.raffle.findUnique({
      where: { id: targetRaffleId as string },
      select: { id: true, title: true, prize: true, pricePerNumber: true, totalNumbers: true },
    });

    if (!raffle) {
      return NextResponse.json({ error: "Rifa não encontrada" }, { status: 404 });
    }

    // Dados do comprador - usamos dados da raffa quando é preference da raffa
    const cleanPhone = isRaffleId ? "" : (order?.buyerPhone?.replace(/\D/g, "") || "");
    const areaCode = cleanPhone.length >= 11 ? cleanPhone.slice(0, 2) : "11";
    const phoneNumber = cleanPhone.length >= 11 ? cleanPhone.slice(2) : cleanPhone;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const backBaseUrl = isRaffleId
      ? `${baseUrl}/dashboard/rifas/${raffle.id}`
      : `${baseUrl}/checkout/sucesso/${order?.id}`;

    // Monta a preference no formato exigido pela API /v1/preferences do Mercado Pago
    const preferenceBody = {
      // Identificação do pedido (usada pelo webhook para marcar como pago)
      external_reference: isRaffleId ? raffle.id : order?.id,

      // Itens do carrinho (pedido específico vai como 1 item com o valor total)
      items: [
        {
          title: `Rifa: ${raffle.title}`,
          quantity: 1,
          unit_price: isRaffleId
            ? Number(raffle.pricePerNumber) * raffle.totalNumbers
            : Number(order?.totalAmount),
          description: `${isRaffleId ? raffle.totalNumbers : order?.quantity || 1} número(s) da rifa - Prêmio: ${raffle.prize}`,
        },
      ],

      // Dados do comprador (campo correto é "payer")
      payer: {
        name: isRaffleId ? "Comprador da Rifa" : (order?.buyerName || "Comprador"),
        email: isRaffleId ? "comprador@rifaai.com.br" : (order?.buyerEmail || "comprador@rifaai.com.br"),
        ...(isRaffleId ? {} : { phone: { area_code: areaCode, number: phoneNumber } }),
      },

      // Configurações de pagamento
      payment_methods: {
        installments: 12,
      },

      // URLs de retorno — comprador volta para o recibo do próprio pedido
      back_urls: {
        success: `${backBaseUrl}?status=success`,
        pending: `${backBaseUrl}?status=pending`,
        failure: `${backBaseUrl}?status=failure`,
      },
      auto_return: "approved",

      // Expiração da preference (24 horas)
      expires: true,
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),

      // Webhook para confirmação automática
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
    };

    // Chama a API do Mercado Pago
    const mpResponse = await fetch("https://api.mercadopago.com/v1/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferenceBody),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("[Checkout Pro] MP API error:", mpResponse.status, errorText);
      return NextResponse.json(
        { error: `Mercado Pago recusou a preferência (${mpResponse.status}): ${errorText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const preference = await mpResponse.json();

    return NextResponse.json({
      sdk_url: preference.sdk_url,
      preference_id: preference.id,
    });
  } catch (error) {
    console.error("[Checkout Pro] Erro:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar preference" },
      { status: 500 }
    );
  }
}