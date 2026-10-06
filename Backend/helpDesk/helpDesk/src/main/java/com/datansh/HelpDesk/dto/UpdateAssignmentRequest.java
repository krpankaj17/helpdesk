package com.datansh.HelpDesk.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UpdateAssignmentRequest(
        UUID agentPublicId,
        String assignedToEmail,
        String assignedToName,
        UUID assignedByPublicId,
        String assignedByEmail,
        Boolean isActive,
        OffsetDateTime assignedAt
) {}
