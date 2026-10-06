package com.datansh.HelpDesk.dto;

import java.util.Map;

public record DashboardMetricsResponse(
        long totalTickets,
        long openTickets,
        long inProgressTickets,
        long waitingTickets,
        long resolvedTickets,
        long closedTickets,
        long overdueTickets,
        long unassignedTickets,
        Map<String, Long> ticketsByPriority,
        Map<String, Long> agentWorkload
) {
}
