package com.datansh.HelpDesk.dto;

public record CreateTicketRequest(String title,
                                  String description,
                                  Long category,
                                  Long priority) {
}
