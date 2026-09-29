package com.datansh.HelpDesk.dto;

import com.datansh.HelpDesk.entity.Priority;
import com.datansh.HelpDesk.entity.TicketCategory;
import com.datansh.HelpDesk.entity.User;
import com.datansh.HelpDesk.enums.TicketStatus;
import jakarta.validation.constraints.NotBlank;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TicketResponse (UUID ticketPublicId,
                              @NotBlank(message = "Title is required")
                              String title,
                              String Description,
                              @NotBlank(message = "Category is required")
                              TicketCategory category,
                              @NotBlank(message = "Priority is Required")
                              Priority ticketPriority,
                              User requestor,
                              TicketStatus status,
                              OffsetDateTime responseDeadline,
                              OffsetDateTime resolutionDeadline) {
}
