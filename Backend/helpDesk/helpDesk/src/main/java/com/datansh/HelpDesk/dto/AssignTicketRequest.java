package com.datansh.HelpDesk.dto;

import java.util.UUID;

public record AssignTicketRequest(
        UUID agentPublicId,
        String agentEmail,
        String agentName
) {}
