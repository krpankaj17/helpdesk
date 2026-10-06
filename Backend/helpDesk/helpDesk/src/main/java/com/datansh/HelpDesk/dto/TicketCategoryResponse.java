package com.datansh.HelpDesk.dto;

public record TicketCategoryResponse(
        Long id,
        String name,
        String description,
        Long ticketCount
) {
    public TicketCategoryResponse(Long id, String name, String description) {
        this(id, name, description, 0L);
    }
}
