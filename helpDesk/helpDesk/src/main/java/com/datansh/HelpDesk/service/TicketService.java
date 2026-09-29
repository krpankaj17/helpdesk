package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.CreateTicketRequest;
import com.datansh.HelpDesk.dto.TicketResponse;
import com.datansh.HelpDesk.entity.Priority;
import com.datansh.HelpDesk.entity.Ticket;
import com.datansh.HelpDesk.entity.TicketCategory;
import com.datansh.HelpDesk.enums.TicketStatus;
import com.datansh.HelpDesk.repository.PriorityRepository;
import com.datansh.HelpDesk.repository.TicketCategoryRepository;
import com.datansh.HelpDesk.repository.TicketRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class TicketService {
    private final TicketRepository ticketRepository;
    private final PriorityRepository priorityRepository;
    private final TicketCategoryRepository ticketCategoryRepository;

    public TicketService(TicketRepository ticketRepository,
                         PriorityRepository priorityRepository,
                         TicketCategoryRepository ticketCategoryRepository){
        this.ticketRepository = ticketRepository;
        this.priorityRepository = priorityRepository;
        this.ticketCategoryRepository = ticketCategoryRepository;

    }
    public Page<TicketResponse> getAllTickets(Pageable pageable){
        return ticketRepository.findAll(pageable).map(this::mapToResponse);
    }
    public TicketResponse createTicket(CreateTicketRequest request){
         TicketCategory category = ticketCategoryRepository.
                 findById(request.category()).
                 orElseThrow(()->new RuntimeException("Category not Found"));

         Priority priority = priorityRepository.findById(request.priority()).
                 orElseThrow(()->new RuntimeException("Priority not found"));
         Ticket ticket = Ticket.builder().
                 title(request.title()).
                 description(request.description())
                 .category(category)
                 .ticketPriority(priority)
                 .status(TicketStatus.OPEN)
                 .build();
         Ticket savedTicket = ticketRepository.save(ticket);
         return mapToResponse(savedTicket);

    }


    public TicketResponse mapToResponse(Ticket ticket){
       return new TicketResponse(ticket.getTicketPublicId(),
               ticket.getTitle(),
               ticket.getDescription(),
               ticket.getCategory(),
               ticket.getTicketPriority(),
               ticket.getRequestor(),
               ticket.getStatus(),
               ticket.getResponseDeadline(),
               ticket.getResolutionDeadline());
    }
}
