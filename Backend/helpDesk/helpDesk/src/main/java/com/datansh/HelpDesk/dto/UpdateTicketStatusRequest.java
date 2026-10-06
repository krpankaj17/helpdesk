package com.datansh.HelpDesk.dto;

import com.datansh.HelpDesk.enums.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateTicketStatusRequest(
        @NotNull(message = "Status is required")
        TicketStatus status,
        String resolutionNote
) {}
